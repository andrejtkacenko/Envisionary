
import { type NextRequest, NextResponse } from 'next/server';

/**
 * A simple diagnostic handler to log incoming webhook requests from Telegram.
 */
export async function POST(req: NextRequest) {
  console.log('[DIAGNOSTIC] Webhook received!');
  try {
    const body = await req.json();
    console.log('[DIAGNOSTIC] Request body:', JSON.stringify(body, null, 2));
    // Acknowledge the request to Telegram
    return NextResponse.json({ status: 200, message: 'Request received' });
  } catch (error: any) {
    console.error('[DIAGNOSTIC] Error reading request body:', error.message);
    // Still acknowledge the request even if body parsing fails
    return NextResponse.json({ status: 200, message: 'Request received with parsing error' });
  }
}

/**
 * Handles GET requests for webhook verification (though Telegram primarily uses POST).
 */
export async function GET(req: NextRequest) {
    console.log('[DIAGNOSTIC] Received a GET request to the webhook URL.');
    return NextResponse.json({ status: 200, message: "Bot is listening, but please use POST for updates." });
}
