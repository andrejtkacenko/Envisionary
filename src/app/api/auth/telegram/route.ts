
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { findUserByTelegramId, createUserFromTelegramData } from '@/lib/firebase-admin-service';
import { getAuth } from 'firebase-admin/auth';
import { adminApp } from '@/lib/firebase-admin';

// Function to validate hash for Telegram Mini App (Web App)
const validateWebAppHash = (data: URLSearchParams, botToken: string): boolean => {
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

// Function to validate hash for Telegram Login Widget
const validateLoginWidgetHash = (data: Record<string, any>, botToken: string): boolean => {
    const hash = data.hash;
    if (!hash) return false;

    const dataToCheck = Object.keys(data)
        .filter(key => key !== 'hash')
        .map(key => `${key}=${data[key]}`)
        .sort()
        .join('\n');
    
    const secretKey = crypto.createHash('sha256').update(botToken).digest();
    const checkHash = crypto.createHmac('sha256', secretKey).update(dataToCheck).digest('hex');

    return checkHash === hash;
};


export async function POST(req: NextRequest) {
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

    if (!BOT_TOKEN) {
      return NextResponse.json({ error: 'TELEGRAM_BOT_TOKEN is not configured' }, { status: 500 });
    }

    if (!adminApp) {
        return NextResponse.json({ error: 'Firebase Admin not initialized' }, { status: 500 });
    }
    
    try {
        const body = await req.text();
        let telegramUser: any;
        let isValid = false;

        // Try to parse as JSON for Login Widget
        try {
            const jsonData = JSON.parse(body);
            if (jsonData.telegramData) {
                isValid = validateLoginWidgetHash(jsonData.telegramData, BOT_TOKEN);
                if (isValid) {
                    telegramUser = jsonData.telegramData;
                }
            }
        } catch (e) {
            // Not JSON, assume it's URL-encoded for Mini App
        }

        // If not parsed as JSON, try URL-encoded
        if (!telegramUser) {
             const params = new URLSearchParams(body);
             isValid = validateWebAppHash(params, BOT_TOKEN);
             const userJson = params.get('user');
             if (isValid && userJson) {
                telegramUser = JSON.parse(userJson);
             }
        }


        if (!isValid || !telegramUser) {
            return NextResponse.json({ error: 'Invalid hash or user data not found' }, { status: 401 });
        }
        
        let appUser = await findUserByTelegramId(telegramUser.id);
        
        if (!appUser) {
            // If user doesn't exist, create one
            appUser = await createUserFromTelegramData(telegramUser);
        }

        const auth = getAuth(adminApp);
        const customToken = await auth.createCustomToken(appUser.uid, { telegramId: appUser.telegramId });
        
        return NextResponse.json({ token: customToken, user: appUser });

    } catch (error) {
        console.error('Error in telegram auth:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
