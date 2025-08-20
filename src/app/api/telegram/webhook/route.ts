import { Telegraf } from 'telegraf';
import type { NextApiRequest, NextApiResponse } from 'next';

const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;

if (!telegramBotToken) {
  throw new Error('TELEGRAM_BOT_TOKEN is not set in environment variables');
}

const bot = new Telegraf(telegramBotToken);

bot.start((ctx) => ctx.reply('Привет! Я бот на Next.js!'));

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    await bot.handleUpdate(req.body);
    res.status(200).end();
  } else {
    res.status(405).end();
  };
}; 