
import { NextRequest, NextResponse } from 'next/server';
import { bot } from '@/lib/telegram-bot';

const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;

export async function POST(req: NextRequest) {
    if (WEBHOOK_SECRET) {
        const secretToken = req.headers.get('X-Telegram-Bot-Api-Secret-Token');
        if (secretToken !== WEBHOOK_SECRET) {
            return new NextResponse('Unauthorized', { status: 401 });
        }
    }

    try {
        const json = await req.json();
        await bot.handleUpdate(json);
        return NextResponse.json({ status: 'ok' });
    } catch (error) {
        console.error("Error in Telegram webhook:", error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
