
import { NextRequest, NextResponse } from 'next/server';
import { bot } from '@/lib/telegram-bot';

const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;

export async function POST(req: NextRequest) {
    // Check for the secret token to ensure the request is from Telegram
    if (WEBHOOK_SECRET) {
        const secretToken = req.headers.get('X-Telegram-Bot-Api-Secret-Token');
        if (secretToken !== WEBHOOK_SECRET) {
            return new NextResponse('Unauthorized', { status: 401 });
        }
    }

    try {
        const json = await req.json();
        // Telegraf's handleUpdate will process the request and call the appropriate handlers
        await bot.handleUpdate(json);
        // Return a 200 OK response to Telegram to acknowledge receipt of the update
        return NextResponse.json({ status: 'ok' });
    } catch (error) {
        console.error("Error in Telegram webhook:", error);
        // In case of an error, respond with a 500 status to let Telegram know something went wrong
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
