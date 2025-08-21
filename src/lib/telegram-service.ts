
'use server';

import { Telegraf } from 'telegraf';
import { customAlphabet } from 'nanoid';
import { db } from '@/lib/firebase';
import { collection, doc, setDoc, getDoc, deleteDoc }- from 'firebase/firestore';

if (!process.env.TELEGRAM_BOT_TOKEN) {
  throw new Error('TELEGRAM_BOT_TOKEN is not set');
}

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const nanoid = customAlphabet('0123456789', 6);

// A simple in-memory store for polling offsets. In a production scenario, you'd use a database.
let lastUpdateId = 0;

bot.start(async (ctx) => {
  try {
    const code = nanoid();
    const telegramId = ctx.from.id;
    console.log(`Generated code ${code} for Telegram user ${telegramId}`);

    // Store the code with the Telegram ID in Firestore for a short time
    const codesCollection = collection(db, 'telegram_auth_codes');
    const docRef = doc(codesCollection, code);
    
    // TTL for 5 minutes
    const expiration = new Date();
    expiration.setMinutes(expiration.getMinutes() + 5);

    await setDoc(docRef, { telegramId, expiresAt: expiration });

    return ctx.reply(`Your one-time login code is: ${code}`);
  } catch (error) {
    console.error('Error handling /start command:', error);
    return ctx.reply('Sorry, something went wrong while generating your code.');
  }
});

export async function processTelegramUpdates() {
  try {
    const updates = await bot.telegram.getUpdates(
      'bot',
      100,
      lastUpdateId ? lastUpdateId + 1 : -1
    );

    if (updates.length > 0) {
      lastUpdateId = updates[updates.length - 1].update_id;
      console.log(`Processing ${updates.length} new updates. New offset: ${lastUpdateId}`);
      await bot.handleUpdate(updates[0]);
      // Return immediately after handling one update to speed up the login process
      return { status: 'update_processed' };
    }
  } catch (error) {
    console.error('Error in long polling:', error);
  }
  return { status: 'no_updates' };
}


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
