
import { Telegraf, type Context } from 'telegraf';
import { message } from 'telegraf/filters';
import { type NextRequest, NextResponse } from 'next/server';
import { telegramChat, TelegramChatInput, TelegramChatOutput } from '@/ai/flows/telegram-chat';
import { findUserByTelegramId } from '@/lib/goals-service';

// This is a makeshift "session" storage. In a real production app, you'd use a database.
const chatHistories: Record<string, any[]> = {};

// Ensure the bot token is set
const botToken = process.env.TELEGRAM_BOT_TOKEN;
if (!botToken) {
  // We don't throw an error during build time anymore.
  // Instead, we'll log an error if the token is missing at runtime.
  console.error("TELEGRAM_BOT_TOKEN is not set in environment variables");
}

const bot = new Telegraf(botToken || "dummy_token_for_init");

// --- Bot Command Handlers ---

bot.start((ctx) => {
  chatHistories[ctx.from.id] = []; // Clear history on /start
  return ctx.reply('Welcome! I am your AI assistant. Tell me about your goals or ask me anything.');
});

bot.help((ctx) => ctx.reply('You can send me a message, and I will try to help you manage your goals. For example: "Create a new goal to learn piano" or "What are my current goals?"'));

// --- Main Message Handler ---

bot.on(message('text'), async (ctx) => {
  const telegramUserId = ctx.from.id.toString();
  const userText = ctx.message.text;

  // Show a "typing..." indicator
  await ctx.telegram.sendChatAction(ctx.chat.id, 'typing');

  try {
    // 1. Find the user in our database by their Telegram ID
    const appUser = await findUserByTelegramId(telegramUserId);
    if (!appUser) {
      // If the user isn't found, they need to link their account in the web app.
      const linkCommand = `/connect ${telegramUserId}`;
      await ctx.reply(`Welcome! To get started, please link your Telegram account with the Zenith Flow app. Open the app, go to the AI Coach page, and paste the following command into the connection input field:\n\n\`${linkCommand}\`\n\nThis is a one-time step to secure your account.`);
      return;
    }

    // 2. Get chat history or start a new one
    const history = chatHistories[telegramUserId] || [];

    // 3. Call the AI flow
    let aiResponse: TelegramChatOutput;
    let toolResult: any;
    
    // First call to the AI
    aiResponse = await telegramChat({
      message: userText,
      userId: appUser.uid,
      history: history,
    });
    
    // Check if the AI requested a tool call
    if (aiResponse.toolRequest) {
      // In a real app, you would call the actual tool function here.
      // For now, we simulate a simple response based on the tool name.
      if (aiResponse.toolRequest.name === 'createGoal') {
         toolResult = { name: 'createGoal', result: `Goal '${aiResponse.toolRequest.input.title}' created successfully.` };
      } else if (aiResponse.toolRequest.name === 'findGoals') {
         toolResult = { name: 'findGoals', result: `Found goals related to '${aiResponse.toolRequest.input.query}'` };
      } else {
         toolResult = { name: aiResponse.toolRequest.name, result: 'Tool executed successfully.' };
      }

      // Add the tool request and result to history
      history.push({ role: 'assistant', content: aiResponse.reply, toolRequest: aiResponse.toolRequest });
      history.push({ role: 'tool', content: 'Tool call result', toolResult: toolResult });
      
      // Call the AI *again* with the tool's result
      const finalAiResponse = await telegramChat({
          message: userText,
          userId: appUser.uid,
          history: history,
      });

      aiResponse.reply = finalAiResponse.reply;

    }

    // 4. Save history and send the final reply
    history.push({ role: 'user', content: userText });
    history.push({ role: 'assistant', content: aiResponse.reply });
    chatHistories[telegramUserId] = history;

    await ctx.reply(aiResponse.reply);

  } catch (error) {
    console.error('Error processing message:', error);
    await ctx.reply('Sorry, I encountered an error. Please try again later.');
  }
});


// --- Webhook Handlers ---

// This handler is for Vercel, which exposes the bot as a serverless function.
export async function POST(req: NextRequest) {
  if (!botToken) {
    console.error("Fatal: TELEGRAM_BOT_TOKEN is not configured.");
    return NextResponse.json({ status: 'error', message: 'Bot is not configured.' }, { status: 500 });
  }

  try {
    const body = await req.json();
    await bot.handleUpdate(body);
    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ status: 'error', message: (error as Error).message }, { status: 500 });
  }
}

// A simple GET handler to confirm the endpoint is live.
export async function GET(req: NextRequest) {
  return NextResponse.json({ status: "ok", message: "Bot is running. Use POST for updates." });
}
