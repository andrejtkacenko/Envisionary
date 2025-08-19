
import { NextRequest, NextResponse } from 'next/server';
import { telegramChat, TelegramChatInput } from '@/ai/flows/telegram-chat';
import { findUserByTelegramId } from '@/lib/goals-service';
import { createGoal, findGoals } from '@/ai/tools/goal-tools';
import { headers } from 'next/headers';


const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;

// A simplified function to send a message.
async function sendMessage(chatId: number, text: string) {
  if (!TELEGRAM_TOKEN) {
    console.error('FATAL: TELEGRAM_BOT_TOKEN is not set. Cannot send message.');
    return;
  }
  try {
    const response = await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
    const data = await response.json();
    if (!data.ok) {
        console.error('Error sending message via Telegram API:', data.description);
    }
  } catch (error) {
    console.error('Network or fetch error when trying to send message:', error);
  }
}

// Function to call the correct tool based on the AI's request
const callTool = async (toolRequest: any, userId: string): Promise<any> => {
    const toolName = toolRequest.name;
    const args = toolRequest.input;
    args.userId = userId;

    console.log(`[Tool Call] Name: ${toolName}, Args:`, args);

    switch (toolName) {
        case 'createGoal':
            return await createGoal(args);
        case 'findGoals':
            return await findGoals(args);
        default:
            console.error(`Unknown tool requested: ${toolName}`);
            throw new Error(`Unknown tool: ${toolName}`);
    }
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('Received Telegram update:', JSON.stringify(body, null, 2));

    const message = body.message || body.edited_message;

    if (!message || !message.text) {
      return NextResponse.json({ status: 'ok, no message text' });
    }

    const chatId = message.chat.id;
    const text = message.text;
    const telegramUserId = message.from.id.toString();

    // The user needs to link their account first using the /connect command on the web app.
    const user = await findUserByTelegramId(telegramUserId);
    if (!user) {
        await sendMessage(chatId, "Please connect your Telegram account in the Zenith Flow web app's AI Coach page first.");
        return NextResponse.json({ status: 'ok, user not linked' });
    }

    // Start a chat with the AI model.
    let aiResponse = await telegramChat({
        message: text,
        userId: user.uid,
        history: [], // For simplicity, we are not maintaining history in this example
    });

    // Handle tool calls if the model requests them.
    if (aiResponse.toolRequest) {
        const toolResult = await callTool(aiResponse.toolRequest, user.uid);
        
        // Send the tool result back to the model to get a final, user-facing response.
        aiResponse = await telegramChat({
            message: text,
            userId: user.uid,
            history: [
                { role: 'assistant', content: aiResponse.reply, toolRequest: aiResponse.toolRequest },
                { role: 'tool', content: '', toolResult: { name: aiResponse.toolRequest.name, result: toolResult } }
            ]
        });
    }

    // Send the final AI response to the user.
    if (aiResponse.reply) {
        await sendMessage(chatId, aiResponse.reply);
    } else {
        console.error("AI did not produce a final reply.");
        await sendMessage(chatId, "Sorry, I encountered an issue and couldn't process your request.");
    }

    return NextResponse.json({ status: 'ok' });

  } catch (error) {
    console.error('Error processing webhook:', error);
    // Return a 200 OK response even if an error occurs to prevent Telegram from resending the update.
    return NextResponse.json({ status: 'error processing request' });
  }
}
