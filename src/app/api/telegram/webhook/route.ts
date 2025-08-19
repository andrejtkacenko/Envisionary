
import { NextRequest, NextResponse } from 'next/server';
// import { telegramChat, TelegramChatInput, TelegramChatOutput } from '@/ai/flows/telegram-chat';
// import { createGoal, findGoals } from '@/ai/tools/goal-tools';
// import { findUserByTelegramId } from '@/lib/goals-service';

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;

// Function to send a message back to the user
async function sendMessage(chatId: number, text: string) {
  if (!text || !text.trim()) {
    console.log("DEBUG: Attempted to send an empty or whitespace message. Aborting.");
    return; 
  }
  const url = `${TELEGRAM_API_URL}/sendMessage`;
  console.log(`DEBUG: Sending message to chat ID ${chatId}: "${text}"`);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
      }),
    });
    const data = await response.json();
    if (!data.ok) {
        console.error('DEBUG: Error sending message:', data.description);
    } else {
        console.log('DEBUG: Message sent successfully.');
    }
  } catch (error) {
    console.error('DEBUG: Failed to send message via fetch:', error);
  }
}


export async function POST(req: NextRequest) {
  console.log("DEBUG: Received a request on /api/telegram/webhook");
  if (!TELEGRAM_TOKEN) {
    console.error("DEBUG: TELEGRAM_BOT_TOKEN is not set. Aborting.");
    return NextResponse.json({ error: "Bot not configured." }, { status: 500 });
  }

  try {
    const body = await req.json();
    console.log('DEBUG: Parsed request body:', JSON.stringify(body, null, 2));

    const message = body.message || body.edited_message;

    if (!message || !message.text) {
        console.log("DEBUG: Update is not a message with text. Ignoring.");
        return NextResponse.json({ status: 'ok' });
    }
    
    const chatId = message.chat.id;
    
    await sendMessage(chatId, "Бот на связи!");
    
    return NextResponse.json({ status: 'ok' });

  } catch (error) {
    console.error('DEBUG: Top-level error in POST handler:', error);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
