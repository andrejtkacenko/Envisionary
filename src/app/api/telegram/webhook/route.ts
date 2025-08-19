
import { NextRequest, NextResponse } from 'next/server';

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;

// A simplified function to send a message.
async function sendMessage(chatId: number, text: string) {
  console.log(`[DIAGNOSTIC] Attempting to send message to chat ID ${chatId}: "${text}"`);
  if (!TELEGRAM_TOKEN) {
    console.error('[DIAGNOSTIC] FATAL: TELEGRAM_BOT_TOKEN is not set. Cannot send message.');
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
        console.error('[DIAGNOSTIC] Error sending message via Telegram API:', data.description);
    } else {
        console.log('[DIAGNOSTIC] Successfully sent message via Telegram API.');
    }
  } catch (error) {
    console.error('[DIAGNOSTIC] Network or fetch error when trying to send message:', error);
  }
}

export async function POST(req: NextRequest) {
  console.log('--- [DIAGNOSTIC] Webhook received a POST request ---');

  let body;
  try {
    // First, try to get the raw text of the request
    const rawText = await req.text();
    console.log('[DIAGNOSTIC] Raw request body text:', rawText);
    
    // Then, try to parse it as JSON
    body = JSON.parse(rawText);
    console.log('[DIAGNOSTIC] Successfully parsed JSON body:', JSON.stringify(body, null, 2));
  } catch (error) {
    console.error('[DIAGNOSTIC] Error parsing request body:', error);
    // Even if parsing fails, we respond to say we got *something*.
    // Note: We can't get a chat_id if parsing fails, so we can't send a message back.
    return NextResponse.json({ error: 'Failed to parse request body' }, { status: 400 });
  }

  const message = body.message || body.edited_message;

  if (!message || !message.chat || !message.chat.id) {
    console.log('[DIAGNOSTIC] Request body does not look like a valid Telegram message. Ignoring.');
    return NextResponse.json({ status: 'ok, not a message' });
  }

  const chatId = message.chat.id;

  // --- IMMEDIATE RESPONSE ---
  // The goal is to send *anything* back to confirm the connection works.
  await sendMessage(chatId, 'Получил запрос. Обрабатываю...');
  
  console.log('[DIAGNOSTIC] Acknowledgment message sent. Responding to webhook.');
  
  // Respond to Telegram to acknowledge receipt of the webhook.
  return NextResponse.json({ status: 'ok' });
}
