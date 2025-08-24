import { Telegraf, Markup } from 'telegraf';
import { getTasksSnapshot, addTask } from '@/lib/goals-service';
import type { AppUser } from '@/types';

// Extend Telegraf context to include our custom properties
interface MyContext extends Telegraf.Context {
    firebaseUser?: AppUser;
}

const bot = new Telegraf<MyContext>(process.env.TELEGRAM_BOT_TOKEN || '');

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
        buttons.push(Markup.button.webApp('🔗 Link Account', `${WEB_APP_URL}/link-telegram`));
    }
    return Markup.inlineKeyboard(buttons);
};

// --- Bot Command Logic (now depends on context) ---

bot.start(async (ctx) => {
    if (!ctx.firebaseUser) {
        return ctx.reply(
            'Welcome! It looks like your account is not linked. Please link it to continue.',
            getWebAppKeyboard(false)
        );
    }
    return ctx.reply(
        `Welcome back to your AI Goal Coach!\n\nYou can manage your tasks directly from Telegram or by opening our web app.`,
        getWebAppKeyboard(true)
    );
});

bot.help((ctx) => {
    ctx.reply(
        `Available commands:\n/start - Welcome message.\n/tasks - View your current to-do list.\n/help - Show this help message.\n\nOpen the web app for full functionality.`,
        getWebAppKeyboard(!!ctx.firebaseUser)
    );
});

bot.command('tasks', async (ctx) => {
    if (!ctx.firebaseUser?.uid) return ctx.reply('Please link your account first.');
    try {
        const tasks = await getTasksSnapshot(ctx.firebaseUser.uid);
        if (tasks.length === 0) {
            return ctx.reply("You have no tasks! Send a message to add one or open the app.", getWebAppKeyboard(true));
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
    if (!ctx.firebaseUser?.uid) return ctx.reply('Please link your account first.');
    if ('text' in ctx.message) {
        const taskTitle = ctx.message.text;
        if (taskTitle.startsWith('/')) return; // Ignore commands
        try {
            await addTask(ctx.firebaseUser.uid, {
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
    console.error(`Ooops, encountered an error for ${ctx.updateType}`, err);
});

export { bot };
export type { MyContext };
