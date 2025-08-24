
import { Telegraf, Markup, Context } from 'telegraf';
import { getTasksSnapshot, addTask } from '@/lib/goals-service';
import type { AppUser } from '@/types';
import { findUserByTelegramId } from './firebase-admin-service';

// Extend Telegraf context to include our custom properties
export interface MyContext extends Context {
    firebaseUser?: AppUser;
}

// Singleton pattern to ensure only one bot instance is created
let bot: Telegraf<MyContext> | null = null;

const setupBot = () => {
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    if (!BOT_TOKEN) {
        console.error("TELEGRAM_BOT_TOKEN is not defined!");
        // Return a dummy bot so the app doesn't crash
        return new Telegraf<MyContext>('');
    }

    const newBot = new Telegraf<MyContext>(BOT_TOKEN);

    // --- MIDDLEWARE to attach Firebase user to context ---
    newBot.use(async (ctx, next) => {
        const from = ctx.message?.from || ctx.callback_query?.from;
        if (from) {
            try {
                const user = await findUserByTelegramId(from.id);
                if (user) {
                    ctx.firebaseUser = user;
                }
            } catch (error) {
                console.error("Firebase auth error for Telegram user:", error);
            }
        }
        return next();
    });

    const getWebAppKeyboard = (isLinked: boolean) => {
        // Use the environment variable, but have a hardcoded fallback to prevent errors.
        const WEB_APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://envisionary-topaz.vercel.app/';

        if (!WEB_APP_URL) {
            console.error("No Web App URL is configured.");
            return Markup.inlineKeyboard([]);
        }
        
        const buttons = [];
        // Ensure the URL doesn't have a trailing slash before appending our path
        const baseUrl = WEB_APP_URL.endsWith('/') ? WEB_APP_URL.slice(0, -1) : WEB_APP_URL;
        
        if (isLinked) {
            buttons.push(Markup.button.webApp('🚀 Open App', `${baseUrl}/?from=telegram`));
        } else {
            buttons.push(Markup.button.webApp('🔗 Link Account', `${baseUrl}/link-telegram`));
        }
        return Markup.inlineKeyboard(buttons);
    };

    // --- Bot Command Logic (now depends on context) ---
    newBot.start(async (ctx) => {
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

    newBot.help((ctx) => {
        ctx.reply(
            `Available commands:\n/start - Welcome message.\n/tasks - View your current to-do list.\n/help - Show this help message.\n\nOpen the web app for full functionality.`,
            getWebAppKeyboard(!!ctx.firebaseUser)
        );
    });

    newBot.command('tasks', async (ctx) => {
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

    newBot.on('message', async (ctx) => {
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

    newBot.catch((err, ctx) => {
        console.error(`Ooops, encountered an error for ${ctx.updateType}`, err);
    });
    
    return newBot;
}

export const initializeBot = () => {
    if (!bot) {
        bot = setupBot();
    }
    return bot;
}
