
import { Telegraf } from 'telegraf';
import { message } from 'telegraf/filters';
import {NextRequest, NextResponse} from 'next/server';
import { telegramChat, TelegramChatInput, TelegramChatOutput } from '@/ai/flows/telegram-chat';
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
const handler = async (req: NextRequest) => {
    try {
        const response = await bot.handle(req as any);
        return new NextResponse(response.body, { headers: response.headers, status: response.status });
    } catch (error) {
        console.error('Error in bot handler:', error);
        return new NextResponse(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
    }
};

export { handler as GET, handler as POST };
