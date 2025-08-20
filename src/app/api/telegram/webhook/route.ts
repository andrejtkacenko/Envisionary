import { Telegraf } from 'telegraf';
import { NextRequest, NextResponse } from 'next/server';

async function handler(req: NextRequest) {
  console.log('[DIAGNOSTIC] Received request:', await req.text());
  
  const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!telegramBotToken) {
    console.error('[FATAL] TELEGRAM_BOT_TOKEN is not set.');
    // Return a 200 to prevent Telegram from retrying, but log the error.
    return new Response('Configuration error', { status: 200 });
  }

  const bot = new Telegraf(telegramBotToken);
  bot.start((ctx) => ctx.reply('Bot is online.'));
  // Add other bot handlers here if needed.

  try {
    const body = await req.json();
    await bot.handleUpdate(body);
    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('Error handling Telegram update:', error);
    return new Response('Error processing update', { status: 200 });
  }
}

export const POST = handler;
