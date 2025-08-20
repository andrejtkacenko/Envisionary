
import { Telegraf } from 'telegraf';
import { message } from 'telegraf/filters';
import {NextRequest, NextResponse} from 'next/server';
import { telegramChat } from '@/ai/flows/telegram-chat';
import { findUserByTelegramId, linkTelegramAccount } from '@/lib/goals-service';

// This is a map to store chat history for each user.
// In a production app, you'd want to use a database for this.
const chatHistories = new Map<string, any[]>();


if (!process.env.TELEGRAM_BOT_TOKEN) {
  throw new Error('TELEGRAM_BOT_TOKEN is not set');
}
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);


bot.start((ctx) => {
  const telegramId = ctx.from.id.toString();
  const connectCommand = `\`/connect ${telegramId}\``;

  ctx.reply(
    `Welcome to Zenith Flow! To link your Telegram account with the web app, go to the AI Coach page and paste this command:\n\n${connectCommand}`
  );
});


bot.on(message('text'), async (ctx) => {
  const telegramId = ctx.from.id.toString();
  const user = await findUserByTelegramId(telegramId);
  
  if (!user) {
    const connectCommand = `\`/connect ${telegramId}\``;
    ctx.reply(
      `Please link your account first. Go to the AI Coach page in the web app and paste this command:\n\n${connectCommand}`
    );
    return;
  }

  const userHistory = chatHistories.get(user.uid) || [];
  
  try {
    const response = await telegramChat({
      message: ctx.message.text,
      userId: user.uid,
      history: userHistory,
    });
    
    // Update history
    userHistory.push({ role: 'user', content: ctx.message.text });
    if (response.toolRequest) {
        userHistory.push({ role: 'assistant', content: response.reply, toolRequest: response.toolRequest });
    } else {
        userHistory.push({ role: 'assistant', content: response.reply });
    }
    chatHistories.set(user.uid, userHistory);

    await ctx.reply(response.reply);

  } catch (error) {
    console.error('Error in Telegram chat handler:', error);
    ctx.reply('Sorry, something went wrong.');
  }
});


// This is the main handler for the Vercel serverless function.
export async function POST(req: NextRequest) {
  console.log('[Webhook] POST request received.');
  try {
    const body = await req.json();
    console.log('[Webhook] Request body parsed successfully.');
    
    // Process the update in the background
    bot.handleUpdate(body).catch(err => console.error('[Webhook] Error handling update:', err));
    
    // Immediately return a 200 OK response to Telegram
    console.log('[Webhook] Sending 200 OK to Telegram.');
    return NextResponse.json({ status: "ok" });

  } catch (error) {
    console.error('[Webhook] Error in POST handler:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// Add a GET handler to ensure the route exists and is accessible
export async function GET() {
    return NextResponse.json({ message: "Telegram webhook is active. Use POST for messages." });
}
