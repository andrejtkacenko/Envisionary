
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { findUserByTelegramId, createUserFromTelegram } from '@/lib/goals-service';
import { getAuth } from 'firebase-admin/auth';
import { adminApp } from '@/lib/firebase-admin';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!BOT_TOKEN) {
  throw new Error('TELEGRAM_BOT_TOKEN is not defined');
}

const validateHash = (data: URLSearchParams, botToken: string): boolean => {
    const hash = data.get('hash');
    if (!hash) return false;

    const dataToCheck: string[] = [];
    data.forEach((value, key) => {
        if (key !== 'hash') {
            dataToCheck.push(`${key}=${value}`);
        }
    });

    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
    const checkHash = crypto.createHmac('sha256', secretKey).update(dataToCheck.sort().join('\n')).digest('hex');

    return checkHash === hash;
};


export async function POST(req: NextRequest) {
    try {
        const body = await req.text();
        const params = new URLSearchParams(body);
        const isValid = validateHash(params, BOT_TOKEN!);

        if (!isValid) {
            return NextResponse.json({ error: 'Invalid hash' }, { status: 401 });
        }
        
        const userJson = params.get('user');
        if (!userJson) {
            return NextResponse.json({ error: 'User data not found' }, { status: 400 });
        }
        
        const telegramUser = JSON.parse(userJson);

        let appUser = await findUserByTelegramId(telegramUser.id);
        
        if (!appUser) {
            appUser = await createUserFromTelegram(telegramUser);
        }

        const auth = getAuth(adminApp);
        const customToken = await auth.createCustomToken(appUser.uid);
        
        return NextResponse.json({ token: customToken, user: appUser });

    } catch (error) {
        console.error('Error in telegram auth:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
