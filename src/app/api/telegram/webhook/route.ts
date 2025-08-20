
import { type NextRequest, NextResponse } from 'next/server';

/**
 * A diagnostic handler for GET requests.
 * You can visit this URL in your browser to check if the server is running.
 */
export async function GET(req: NextRequest) {
  console.log('[DIAGNOSTIC] GET request received. The endpoint is live.');
  return NextResponse.json({ status: "ok", message: "Bot is running. Use POST for updates." });
}

/**
 * A diagnostic handler for POST requests from Telegram.
 * This will log any incoming request to the console.
 */
export async function POST(req: NextRequest) {
  console.log('[DIAGNOSTIC] POST request received! This confirms Telegram is reaching the server.');
  try {
    const body = await req.json();
    console.log('[DIAGNOSTIC] Request body:', JSON.stringify(body, null, 2));
  } catch (error: any) {
    console.error('[DIAGNOSTIC] Error parsing request body:', error.message);
    const textBody = await req.text();
    console.log('[DIAGNOSTIC] Raw request text:', textBody);
  }
  // We respond with a 200 OK to Telegram, even though we aren't processing the message.
  return NextResponse.json({ status: 'ok' });
}
