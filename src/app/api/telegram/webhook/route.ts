
import { NextResponse } from 'next/server';
import { bot } from '@/lib/telegram-bot';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  if (!bot) {
    return new Response('Telegram Bot not configured.', { status: 500 });
  }
  try {
    const payload = await req.json();
    // We pass the update to the Telegraf instance
    await bot.handleUpdate(payload);
    // Acknowledge the update to Telegram
    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('Error handling Telegram update:', error);
    // Still send a 200 to Telegram to prevent retries
    return new Response('Error processing update', { status: 200 });
  }
}

// Add a GET handler for simple "is it alive?" checks
export async function GET() {
  return NextResponse.json({ message: "Hello! Zenith Flow Telegram webhook is active." });
}
