
import { type NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // Use a unique console log message to be sure our code is running
    console.log('[DIAGNOSTIC] POST request received, body:', JSON.stringify(body, null, 2));
    
    // Immediately return a success response to Telegram
    return NextResponse.json({ status: 'ok' }, { status: 200 });
  } catch (error) {
    console.error('[DIAGNOSTIC] Error in POST handler:', error);
    // Still return ok, but log the error
    return NextResponse.json({ status: 'error', message: 'Failed to parse body' }, { status: 200 });
  }
}

export async function GET(req: NextRequest) {
    console.log('[DIAGNOSTIC] GET request received. The endpoint is live.');
    return NextResponse.json({ status: "ok", message: "Bot is running. Use POST for updates." });
}
