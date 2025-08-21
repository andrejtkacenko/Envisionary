
import { Telegraf } from 'telegraf';
import { collection, doc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { nanoid } from 'nanoid';
import { NextRequest, NextResponse } from 'next/server';

if (!process.env.TELEGRAM_BOT_TOKEN) {
  throw new Error('TELEGRAM_BOT_TOKEN is not set');
}

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

// Generate a random 6-digit code
const generateCode = () => nanoid(6).toUpperCase();

// Store the code in Firestore with a short expiry time (e.g., 5 minutes)
const saveCode = async (telegramId: number, code: string) => {
  const codesCollection = collection(db, 'telegram_auth_codes');
  const expiryDate = Timestamp.fromMillis(Date.now() + 5 * 60 * 1000); // 5 minutes
  await setDoc(doc(codesCollection, code), {
    telegramId: String(telegramId),
    code,
    expiresAt: expiryDate,
    used: false,
  });
};

bot.start(async (ctx) => {
  const code = generateCode();
  await saveCode(ctx.from.id, code);
  const message = `Hello, ${ctx.from.first_name}!\n\nYour one-time login code for Zenith Flow is:\n\n*${code}*\n\nThis code will expire in 5 minutes.`;
  await ctx.replyWithMarkdown(message);
});

// This is the main webhook handler
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        await bot.handleUpdate(body);
        // Using `new Response` for a more direct, empty 200 OK response
        return new Response(null, { status: 200 }); 
    } catch (error) {
        console.error('Error handling Telegram update:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
