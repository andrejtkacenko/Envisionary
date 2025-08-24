
import { NextRequest, NextResponse } from 'next/server';
import { bot, type MyContext } from '@/lib/telegram-bot';
import { findUserByTelegramId } from '@/lib/firebase-admin-service';

export async function POST(req: NextRequest) {
    const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;

    if (WEBHOOK_SECRET) {
        const secretToken = req.headers.get('X-Telegram-Bot-Api-Secret-Token');
        if (secretToken !== WEBHOOK_SECRET) {
            return new NextResponse('Unauthorized', { status: 401 });
        }
    }
    
    // Ensure bot token is set before handling update
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    if (!BOT_TOKEN) {
        console.error("TELEGRAM_BOT_TOKEN is not configured. Cannot handle webhook.");
        return new NextResponse('Internal Server Error: Bot not configured', { status: 500 });
    }
    bot.token = BOT_TOKEN;

    try {
        const update = await req.json();
        const from = update.message?.from || update.callback_query?.from;
        
        // This middleware attaches the Firebase user to the context if they exist
        bot.use(async (ctx, next) => {
             if (from) {
                try {
                    const user = await findUserByTelegramId(from.id);
                    if (user) {
                        (ctx as MyContext).firebaseUser = user;
                    }
                } catch (error) {
                    console.error("Firebase auth error for Telegram user:", error);
                }
            }
            await next();
        });
        
        await bot.handleUpdate(update);
        return NextResponse.json({ status: 'ok' });
    } catch (error) {
        console.error("Error in Telegram webhook:", error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
