import { Telegraf } from 'telegraf';
import { NextResponse } from 'next/server';

// Explicitly set the runtime to Node.js
export const runtime = 'nodejs';

// Initialize the bot
const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  throw new Error('TELEGRAM_BOT_TOKEN is not set in environment variables!');
}
const bot = new Telegraf(token);

// --- Bot Logic ---
// Simple echo bot
bot.on('text', async (ctx) => {
  console.log(`Received message: ${ctx.message.text}`);
  await ctx.reply(ctx.message.text);
});


// --- Webhook Handlers ---

// This function handles POST requests from Telegram
export async function POST(request: Request) {
  console.log('[Webhook] POST request received.');
  try {
    const body = await request.json();
    // It's crucial to handle the update without waiting for it to complete.
    // This immediately sends a 200 OK back to Telegram.
    bot.handleUpdate(body);
  } catch (error) {
    console.error('[Webhook] Error processing update:', error);
  }
  
  // Always return a 200 OK response to Telegram
  return NextResponse.json({ status: 'ok' });
}

// This function handles GET requests (for checking if the webhook is alive)
export async function GET() {
  console.log('[Webhook] GET request received.');
  return NextResponse.json({ message: "Telegram webhook is active. Use POST for messages." });
}
