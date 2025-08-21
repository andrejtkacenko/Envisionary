
import { bot } from '@/lib/telegram-bot';
import { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// This is the new dynamic route handler
export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  // Immediately acknowledge Telegram to prevent timeouts and retries
  const response = new Response(null, { status: 200 });

  // Security check: Ensure the request is from our bot
  if (params.token !== process.env.TELEGRAM_BOT_TOKEN) {
    console.error('Invalid bot token received.');
    return response; // Still return 200 to not give away info
  }
  
  if (!bot) {
    console.error('Telegram Bot not configured.');
    return response;
  }
  
  try {
    const payload = await req.json();
    // Don't await this. Let it run in the background after we've responded.
    bot.handleUpdate(payload).catch(err => {
        console.error('Error in bot.handleUpdate:', err);
    });
  } catch (error) {
    console.error('Error parsing or handling Telegram update:', error);
  }
  
  return response;
}
