
import { Telegraf, Markup } from 'telegraf';
import { getTasksSnapshot, addTask, findUserByTelegramId } from './goals-service';

if (!process.env.TELEGRAM_BOT_TOKEN) {
    throw new Error("TELEGRAM_BOT_TOKEN is not defined in the environment variables");
}
if (!process.env.NEXT_PUBLIC_APP_URL) {
    throw new Error("NEXT_PUBLIC_APP_URL is not defined in the environment variables");
}

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const webAppUrl = process.env.NEXT_PUBLIC_APP_URL;


const getWebAppKeyboard = () => {
    // This URL will open the main page, which will then handle the Telegram auth flow.
    return Markup.inlineKeyboard([
      Markup.button.webApp('Open App', `${webAppUrl}/?from=telegram`),
    ]);
}

// Middleware to ensure user has an account.
bot.use(async (ctx, next) => {
    const from = ctx.from;
    if (!from) return; // Should not happen for messages/commands

    try {
        let user = await findUserByTelegramId(from.id);
        if (!user) {
            ctx.reply(
                'Welcome! To get started, please open our web app to create and link your account.', 
                getWebAppKeyboard()
            );
            return; // Stop processing further
        }
        (ctx as any).firebaseUser = user; // Attach user to context
        await next(); // Continue to next middleware
    } catch (error) {
        console.error("Firebase auth error for Telegram user:", error);
        ctx.reply("Sorry, I'm having trouble authenticating you right now. Please try again later.");
    }
});


bot.start((ctx) => {
    ctx.reply(
`Welcome to your AI Goal Coach!

You can manage your tasks directly from Telegram or by opening our web app.`,
    getWebAppKeyboard()
    );
});

bot.help((ctx) => {
    ctx.reply(
`Available commands:
/start - Welcome message.
/tasks - View your current to-do list.
/help - Show this help message.

Open the web app for full functionality.`,
    getWebAppKeyboard()
    );
});


bot.command('tasks', async (ctx) => {
    try {
        const userId = (ctx as any).firebaseUser.uid;
        const tasks = await getTasksSnapshot(userId);
        
        if (tasks.length === 0) {
            ctx.reply("You have no tasks! Send a message to add one or open the app.", getWebAppKeyboard());
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
                priority: 'p3', // Default priority
            });
            ctx.reply(`✅ Task added: "${taskTitle}"`);
        } catch (error) {
            console.error("Error adding task from telegram:", error);
            ctx.reply(`I couldn't add your task. Please try again.`);
        }
    }
});


// Global error handler
bot.catch((err, ctx) => {
  console.log(`Ooops, encountered an error for ${ctx.updateType}`, err);
  // Specifically log if the bot is blocked
  if ((err as any).code === 403 && (err as any).description === 'Forbidden: bot was blocked by the user') {
    console.log(`Bot was blocked by user: ${ctx.from?.id}. No further messages will be sent to this user.`);
  }
});

export { bot };
