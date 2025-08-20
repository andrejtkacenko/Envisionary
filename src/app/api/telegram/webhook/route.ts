
import { NextRequest, NextResponse } from 'next/server';

// This line is crucial for ensuring the full Node.js runtime is used.
export const runtime = 'nodejs';

// --- Webhook Handler ---
// This function will be triggered by Telegram when a new message is sent to the bot.
export async function POST(request: NextRequest) {
  try {
    // The most basic log to see if the request ever reaches here.
    console.log('[Webhook] POST request received.');
    
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
