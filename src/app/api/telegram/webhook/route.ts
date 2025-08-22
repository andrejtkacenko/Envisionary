
import { NextRequest, NextResponse } from 'next/server';
import { bot } from '@/lib/telegram-bot';

export async function POST(req: NextRequest) {
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
