
'use server';

import { db } from '@/lib/firebase';
import { doc, getDoc, deleteDoc } from 'firebase/firestore';

/**
 * Verifies a one-time code from Telegram.
 * @param code The 6-digit code from the user.
 * @returns The Telegram User ID if the code is valid and not expired, otherwise null.
 */
export async function verifyTelegramCode(code: string): Promise<{ userId: number } | null> {
    const docRef = doc(db, 'telegram_auth_codes', code);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        const data = docSnap.data();
        const now = new Date();
        
        // Clean up the used code
        await deleteDoc(docRef);

        if (data.expiresAt.toDate() > now) {
            return { userId: data.telegramId };
        } else {
            console.log(`Code ${code} has expired.`);
            return null;
        }
    } else {
        console.log(`Code ${code} not found.`);
        return null;
    }
}
