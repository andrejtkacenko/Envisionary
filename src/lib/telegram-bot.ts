
import { Bot } from 'grammy';
import { customAlphabet } from 'nanoid';
import { db } from '@/lib/firebase';
import { collection, doc, setDoc, Timestamp } from 'firebase/firestore';

if (!process.env.TELEGRAM_BOT_TOKEN) {
  console.warn('TELEGRAM_BOT_TOKEN is not set. Telegram features will be disabled.');
}

// Ensure the bot is only initialized if the token is present
export const bot = process.env.TELEGRAM_BOT_TOKEN 
    ? new Bot(process.env.TELEGRAM_BOT_TOKEN) 
    : null;

const nanoid = customAlphabet('0123456789', 6);

if (bot) {
    bot.command("start", async (ctx) => {
        try {
            const code = nanoid();
            const telegramId = ctx.from.id;
            console.log(`Generated code ${code} for Telegram user ${telegramId}`);

            // Store the code with the Telegram ID in Firestore for a short time
            const codesCollection = collection(db, 'telegram_auth_codes');
            const docRef = doc(codesCollection, code);
            
            const expiration = Timestamp.fromDate(new Date(Date.now() + 5 * 60 * 1000)); // 5 minutes TTL

            await setDoc(docRef, { telegramId, expiresAt: expiration });

            return ctx.reply(`Your one-time login code is: ${code}`);
        } catch (error) {
            console.error('Error handling /start command:', error);
            return ctx.reply('Sorry, something went wrong while generating your code.');
        }
    });
}
