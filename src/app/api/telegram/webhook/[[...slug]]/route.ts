
import { Telegraf } from 'telegraf';
import { message } from 'telegraf/filters';
import {NextRequest, NextResponse} from 'next/server';
import { telegramChat } from '@/ai/flows/telegram-chat';
import { findUserByTelegramId } from '@/lib/goals-service';

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
    // Note: This implementation does not handle tool calls from Telegram.
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
  
  // Immediately respond to Telegram to avoid timeouts and redirect errors
  const response = NextResponse.json({ status: 'ok' });

  // Process the update in the background
  try {
    const body = await req.json();
    console.log('[Webhook] Request body parsed successfully:', body);
    // We don't await this, letting it run in the background
    bot.handleUpdate(body);
  } catch (error) {
    console.error('[Webhook] Error handling update:', error);
  }
  
  return response;
}

export async function GET(req: NextRequest) {
    console.log('[DIAGNOSTIC] GET request received. The endpoint is live.');
    // You can also try setting the webhook here if you visit the URL
    // try {
    //   await bot.telegram.setWebhook('YOUR_PUBLIC_URL/api/telegram/webhook');
    //   return NextResponse.json({ status: "ok", message: "Webhook set!" });
    // } catch (error) {
    //   return NextResponse.json({ status: "error", message: (error as Error).message });
    // }
    return NextResponse.json({ status: "ok", message: "Bot is running. Use POST for updates." });
}
