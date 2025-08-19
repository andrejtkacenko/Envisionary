
import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  console.log('[DIAGNOSTIC] Webhook received a POST request.');

  try {
    const body = await req.json();
    console.log('[DIAGNOSTIC] Request Body:', JSON.stringify(body, null, 2));
  } catch (error: any) {
    console.error('[DIAGNOSTIC] Error parsing request body:', error.message);
    const textBody = await req.text();
    console.log('[DIAGNOSTIC] Raw text body:', textBody);
  }

  // Use the standard Web API Response object for maximum compatibility.
  return new Response(JSON.stringify({ status: 'ok' }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}
