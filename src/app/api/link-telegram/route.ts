
import { NextRequest, NextResponse } from 'next/server';
import { findUserByTelegramId, linkTelegramToUser } from '@/lib/firebase-admin-service';

export async function POST(req: NextRequest) {
    try {
        const { uid, telegramId } = await req.json();

        if (!uid || !telegramId) {
            return NextResponse.json({ error: 'User ID and Telegram ID are required.' }, { status: 400 });
        }

        // Check if the telegram ID is already linked to another user
        const existingUser = await findUserByTelegramId(telegramId);
        if (existingUser && existingUser.uid !== uid) {
            return NextResponse.json({ error: 'This Telegram account is already linked to another user.' }, { status: 409 });
        }

        // Link the account
        await linkTelegramToUser(uid, telegramId);

        return NextResponse.json({ success: true, message: 'Account linked successfully.' });

    } catch (error) {
        console.error('Error in link-telegram API:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
