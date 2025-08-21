
import { bot } from '@/lib/telegram-bot';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  // Immediately acknowledge Telegram to prevent timeouts and retries
  // This is a common strategy when webhook processing might take time or face network issues.
  const response = new Response(null, { status: 200 });

  if (!bot) {
    console.error('Telegram Bot not configured.');
    return response; // Still return 200 OK
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

// Add a GET handler for simple "is it alive?" checks
export async function GET() {
  return new Response("Hello! Zenith Flow Telegram webhook is active.", {status: 200});
}
