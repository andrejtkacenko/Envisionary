
import { NextRequest, NextResponse } from 'next/server';
import { bot } from '@/lib/telegram-bot';

export async function POST(req: NextRequest) {
    const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;

    if (WEBHOOK_SECRET) {
        const secretToken = req.headers.get('X-Telegram-Bot-Api-Secret-Token');
        if (secretToken !== WEBHOOK_SECRET) {
            return new NextResponse('Unauthorized', { status: 401 });
        }
    }
    
    // Ensure bot token is set before handling update
    if (!bot.token) {
        const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
        if (BOT_TOKEN) {
            bot.token = BOT_TOKEN;
        } else {
             console.error("TELEGRAM_BOT_TOKEN is not configured. Cannot handle webhook.");
             return new NextResponse('Internal Server Error: Bot not configured', { status: 500 });
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
