
import { NextRequest, NextResponse } from 'next/server';
import { Telegraf } from 'telegraf';

// This line is crucial for ensuring the full Node.js runtime is used.
export const runtime = 'nodejs';

// Ensure the bot token is set in the environment variables
const botToken = process.env.TELEGRAM_BOT_TOKEN;
if (!botToken) {
  throw new Error("TELEGRAM_BOT_TOKEN is not set in the environment variables.");
}

// Initialize the bot
const bot = new Telegraf(botToken);

// --- Bot Logic ---
// The simplest "echo" bot. It replies with the same text it receives.
bot.on('text', async (ctx) => {
  try {
    // Log the received message to the server console
    console.log(`[Bot] Received message from ${ctx.from.username}: ${ctx.message.text}`);
    // Reply to the user with the same message
    await ctx.reply(ctx.message.text);
  } catch (error) {
    console.error('[Bot] Error handling text message:', error);
  }
});

// --- Webhook Handler ---
// This function will be triggered by Telegram when a new message is sent to the bot.
export async function POST(request: NextRequest) {
  try {
    // We process the update in the background.
    const payload = await request.json();
    console.log('[Webhook] POST request received, processing in background.', payload);
    
    // Use a timeout of 0 to handle the update on the next tick of the event loop.
    // This ensures the response is sent before processing starts.
    setTimeout(() => {
        bot.handleUpdate(payload);
    }, 0);

    // We immediately respond to Telegram with a 200 OK to prevent timeouts.
    return NextResponse.json({ status: 'ok' });

  } catch (error) {
    console.error('[Webhook] Error in POST handler:', error);
    // If something goes wrong, return an error response.
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// A simple GET handler to confirm the webhook is reachable via a browser.
export async function GET() {
  return NextResponse.json({ message: "Telegram webhook is active. Use POST for messages." });
}
