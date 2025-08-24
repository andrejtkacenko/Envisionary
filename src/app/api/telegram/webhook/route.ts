
import { NextRequest, NextResponse } from 'next/server';
import { initializeBot, type MyContext } from '@/lib/telegram-bot';

export async function POST(req: NextRequest) {
    const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;

    if (WEBHOOK_SECRET) {
        const secretToken = req.headers.get('X-Telegram-Bot-Api-Secret-Token');
        if (secretToken !== WEBHOOK_SECRET) {
            return new NextResponse('Unauthorized', { status: 401 });
        }
    }
    
    try {
        const bot = initializeBot();
        const update = await req.json();
        
        await bot.handleUpdate(update);
        return NextResponse.json({ status: 'ok' });

    } catch (error) {
        console.error("Error in Telegram webhook:", error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
