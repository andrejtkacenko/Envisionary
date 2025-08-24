import { Telegraf, Markup } from 'telegraf';
import { getTasksSnapshot, addTask } from '@/lib/goals-service';
import { findUserByTelegramId } from '@/lib/firebase-admin-service';

// --- Singleton Pattern for Telegraf Bot ---
declare global {
  var bot: Telegraf | undefined;
}

const initializeBot = (): Telegraf => {
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  if (!BOT_TOKEN) {
    console.error("TELEGRAM_BOT_TOKEN is not defined in the environment variables. Bot will not work.");
    return new Telegraf(''); // Return a dummy instance
  }

  const bot = new Telegraf(BOT_TOKEN);
  
  const getWebAppKeyboard = (isLinked: boolean) => {
    const WEB_APP_URL = process.env.NEXT_PUBLIC_APP_URL;
    if (!WEB_APP_URL) {
      console.error("NEXT_PUBLIC_APP_URL is not defined, web app buttons will not work.");
      return Markup.inlineKeyboard([]);
    }
    const buttons = [];
    if (isLinked) {
      buttons.push(Markup.button.webApp('🚀 Open App', `${WEB_APP_URL}/?from=telegram`));
    } else {
      // Note: The linking URL should not have `from=telegram` to avoid the mini-app auth flow
      buttons.push(Markup.button.webApp('🔗 Link Account', `${WEB_APP_URL}/link-telegram`));
    }
    return Markup.inlineKeyboard(buttons);
  };
  
  // --- Bot Middleware and Commands ---
  
  bot.use(async (ctx, next) => {
    const from = ctx.from;
    if (!from) return;

    try {
      let user = await findUserByTelegramId(from.id);
      if (!user) {
        ctx.reply(
          'Welcome! To use me, you need to link your Telegram account to your Zenith Flow profile. Please open the web app to link your account.',
          getWebAppKeyboard(false)
        );
        return;
      }
      (ctx as any).firebaseUser = user;
      await next();
    } catch (error) {
      console.error("Firebase auth error for Telegram user:", error);
      ctx.reply("Sorry, I'm having trouble authenticating you right now. Please try again later.");
    }
  });

  bot.start(async (ctx) => {
    const userId = (ctx as any).firebaseUser?.uid;
    if (!userId) {
      ctx.reply(
        'Welcome! It looks like your account is not linked. Please link it to continue.',
        getWebAppKeyboard(false)
      );
      return;
    }
    
    ctx.reply(
      `Welcome back to your AI Goal Coach!\n\nYou can manage your tasks directly from Telegram or by opening our web app.`,
      getWebAppKeyboard(true)
    );
  });

  bot.help((ctx) => {
    ctx.reply(
      `Available commands:\n/start - Welcome message.\n/tasks - View your current to-do list.\n/help - Show this help message.\n\nOpen the web app for full functionality.`,
      getWebAppKeyboard(true)
    );
  });

  bot.command('tasks', async (ctx) => {
    try {
      const userId = (ctx as any).firebaseUser.uid;
      const tasks = await getTasksSnapshot(userId);
      
      if (tasks.length === 0) {
        ctx.reply("You have no tasks! Send a message to add one or open the app.", getWebAppKeyboard(true));
        return;
      }

      const taskList = tasks
        .filter(t => !t.isCompleted)
        .map(t => `- ${t.title}`)
        .join('\n');
        
      ctx.reply(`Your tasks:\n${taskList || "All tasks are completed! 🎉"}`);
    } catch (error) {
      console.error("Error fetching tasks for telegram:", error);
      ctx.reply("Sorry, I couldn't fetch your tasks right now.");
    }
  });

  bot.on('message', async (ctx) => {
    if ('text' in ctx.message) {
      const taskTitle = ctx.message.text;
      // Ignore commands
      if (taskTitle.startsWith('/')) return;

      try {
        const userId = (ctx as any).firebaseUser.uid;
        await addTask(userId, {
          title: taskTitle,
          isCompleted: false,
          priority: 'p3',
        });
        ctx.reply(`✅ Task added: "${taskTitle}"`);
      } catch (error) {
        console.error("Error adding task from telegram:", error);
        ctx.reply(`I couldn't add your task. Please try again.`);
      }
    }
  });

  bot.catch((err, ctx) => {
    console.log(`Ooops, encountered an error for ${ctx.updateType}`, err);
    if ((err as any).code === 403 && (err as any).description === 'Forbidden: bot was blocked by the user') {
      console.log(`Bot was blocked by user: ${ctx.from?.id}. No further messages will be sent to this user.`);
    }
  });

  return bot;
};

// Create a singleton instance of the bot
const bot = global.bot || initializeBot();

if (process.env.NODE_ENV !== 'production') {
  global.bot = bot;
}

export { bot };
