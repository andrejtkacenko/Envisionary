import { Telegraf } from 'telegraf';
import { NextRequest, NextResponse } from 'next/server';
import { telegramChat } from '@/ai/flows/telegram-chat';
import { findUserByTelegramId, linkTelegramAccount } from '@/lib/goals-service';
import { createGoalTool, findGoalsTool } from '@/ai/tools/goal-tools';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;

if (!telegramBotToken) {
  throw new Error('TELEGRAM_BOT_TOKEN is not set in environment variables');
}

const bot = new Telegraf(telegramBotToken);

// Helper to manage chat history in Firestore
const getChatHistory = async (chatId: number): Promise<any[]> => {
    const historyRef = doc(db, 'telegram_chats', String(chatId));
    const docSnap = await getDoc(historyRef);
    return docSnap.exists() ? docSnap.data().history : [];
};

const saveChatHistory = async (chatId: number, history: any[]) => {
    const historyRef = doc(db, 'telegram_chats', String(chatId));
    await setDoc(historyRef, { history }, { merge: true });
};


bot.start(async (ctx) => {
    const telegramId = String(ctx.from.id);
    const user = await findUserByTelegramId(telegramId);

    if (user) {
        ctx.reply(`Welcome back, ${user.displayName || user.email}! You are already connected. You can start managing your goals.`);
    } else {
        ctx.reply(`Welcome to Zenith Flow! To connect your account, please go to the AI Coach page in the web app and enter the following command:\n\n/connect ${telegramId}`);
    }
});

bot.command('connect', (ctx) => {
     ctx.reply(`To connect your account, copy this command and paste it into the AI Coach page in the web app:\n\n${ctx.message.text}`);
});


bot.on('message', async (ctx: any) => {
    const chatId = ctx.chat.id;
    const messageText = ctx.message.text || '';
    const telegramId = String(ctx.from.id);
    
    // Ignore the /connect command in the main message handler
    if (messageText.startsWith('/connect')) {
        return;
    }

    try {
        await ctx.replyWithChatAction('typing');

        const user = await findUserByTelegramId(telegramId);
        if (!user) {
            ctx.reply(`Please connect your account first. Go to the web app's AI Coach page and enter the command given by /start.`);
            return;
        }

        const history = await getChatHistory(chatId);
        
        let aiResponse = await telegramChat({
            message: messageText,
            userId: user.uid,
            history: history,
        });

        if (aiResponse.toolRequest) {
            const toolName = aiResponse.toolRequest.name;
            const args = aiResponse.toolRequest.input;
            args.userId = user.uid; // Ensure userId is passed to the tool
            
            let toolResult;
            try {
                 if (toolName === 'createGoal') {
                    toolResult = await createGoalTool(args);
                } else if (toolName === 'findGoals') {
                    toolResult = await findGoalsTool(args);
                } else {
                    throw new Error(`Unknown tool: ${toolName}`);
                }

                // Construct history entry for the tool call
                 history.push(
                    { role: 'assistant', content: aiResponse.reply, toolRequest: aiResponse.toolRequest },
                    { role: 'tool', content: `Result for ${toolName}`, toolResult: { name: toolName, result: toolResult } }
                );

                // Call the AI again with the tool result
                const finalResponse = await telegramChat({
                    message: messageText,
                    userId: user.uid,
                    history: history,
                });

                ctx.reply(finalResponse.reply);
                history.push({ role: 'assistant', content: finalResponse.reply });

            } catch (toolError: any) {
                console.error(`Tool Error (${toolName}):`, toolError);
                ctx.reply(`I encountered an error trying to use the ${toolName} tool. Please try again.`);
                history.push({ role: 'assistant', content: `Error with tool: ${toolError.message}` });
            }

        } else {
            ctx.reply(aiResponse.reply);
            history.push({ role: 'user', content: messageText });
            history.push({ role: 'assistant', content: aiResponse.reply });
        }
        
        // Trim history to the last 10 messages to avoid large documents
        await saveChatHistory(chatId, history.slice(-10));

    } catch (error) {
        console.error('Error processing Telegram message:', error);
        ctx.reply("Sorry, I encountered an error. Please try again later.");
    }
});


async function handler(req: NextRequest) {
  try {
    const body = await req.json();
    await bot.handleUpdate(body);
    return NextResponse.json({ status: 200 });
  } catch (error) {
    console.error('Error handling Telegram update:', error);
    // Return a 200 to prevent Telegram from retrying on every error
    return new Response('Error processing update', { status: 200 });
  }
}

export const POST = handler;
export const GET = handler; // For initial webhook setup verification
