
import { NextRequest, NextResponse } from 'next/server';
import { telegramChat } from '@/ai/flows/telegram-chat';

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;

// Function to send a message back to the user
async function sendMessage(chatId: number, text: string) {
  const url = `${TELEGRAM_API_URL}/sendMessage`;
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
        console.error('Error sending message:', data.description);
    }
  } catch (error) {
    console.error('Failed to send message:', error);
  }
}

export async function POST(req: NextRequest) {
  if (!TELEGRAM_TOKEN) {
    console.error("TELEGRAM_BOT_TOKEN is not set.");
    return NextResponse.json({ error: "Bot not configured." }, { status: 500 });
  }

  try {
    const body = await req.json();
    console.log('Received Telegram update:', JSON.stringify(body, null, 2));

    const message = body.message || body.edited_message;

    if (message && message.text) {
      const chatId = message.chat.id;
      const text = message.text;
      const userId = message.from.id.toString();
      
      // Don't wait for the AI response to send the initial "OK" to Telegram.
      // Telegram has a short timeout, so we respond immediately.
      // The actual reply will be sent via the sendMessage function.
      (async () => {
        try {
          // Send a "typing..." action to give user feedback
          await fetch(`${TELEGRAM_API_URL}/sendChatAction`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, action: 'typing' }),
          });

          // Call the Genkit flow
          const aiResponse = await telegramChat({ message: text, userId: userId });
          
          // Send the AI's reply back to the user
          await sendMessage(chatId, aiResponse.reply);

        } catch (e: any) {
            console.error("Error processing message with AI:", e);
            await sendMessage(chatId, "Sorry, I encountered an error. Please try again later.");
        }
      })();


    } else {
        console.log("Received a non-message update, ignoring.");
    }

    // Respond to Telegram immediately to acknowledge receipt of the update
    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
