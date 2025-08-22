import { Bot } from "grammy";
import { addTask, getTasks } from "./goals-service";
import type { Task } from "@/types";

const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  console.error("TELEGRAM_BOT_TOKEN is not set in the environment variables.");
}

// We are creating the bot instance only if the token is available.
// This is to prevent the app from crashing if the token is not set.
export const bot = token ? new Bot(token) : null;

if (bot) {
    bot.command("start", (ctx) => {
        const welcomeMessage = `
    Welcome to Zenith Flow!
    
    You can use me to manage your tasks directly from Telegram.
    
    Here are the commands you can use:
    /tasks - View your current tasks
    
    To add a new task, just send me a message!
        `;
        ctx.reply(welcomeMessage);
    });

    bot.command("tasks", async (ctx) => {
        // We will use a mock user ID for now. 
        // In a real application, you would need to implement user authentication.
        const mockUserId = "telegram-user"; 
        
        try {
            let tasks: Task[] = [];
            
            const unsubscribe = getTasks(mockUserId, (userTasks) => {
                tasks = userTasks;
            }, (error) => {
                console.error(error);
                ctx.reply("Sorry, there was an error fetching your tasks.");
            });

            // Let's give it a moment to fetch the tasks.
            await new Promise(resolve => setTimeout(resolve, 1000));
            unsubscribe();

            if (tasks.length === 0) {
                ctx.reply("You have no tasks. Send a message to create one!");
                return;
            }

            const taskList = tasks.map(task => {
                const status = task.isCompleted ? "✅" : "❌";
                return `${status} ${task.title}`;
            }).join("\n");

            ctx.reply(`Your tasks:\n\n${taskList}`);

        } catch (error) {
            console.error("Failed to fetch tasks for Telegram bot:", error);
            ctx.reply("Sorry, I couldn't fetch your tasks at the moment.");
        }
    });

    bot.on("message:text", async (ctx) => {
        const taskTitle = ctx.message.text;
        
        // We will use a mock user ID for now.
        const mockUserId = "telegram-user"; 
        
        try {
            await addTask(mockUserId, {
                title: taskTitle,
                isCompleted: false,
                priority: "p4",
            });
            ctx.reply(`Task "${taskTitle}" has been added!`);
        } catch (error) {
            console.error("Failed to add task via Telegram bot:", error);
            ctx.reply("Sorry, there was an error adding your task.");
        }
    });
    
    bot.catch((err) => {
        const ctx = err.ctx;
        console.error(`Error while handling update ${ctx.update.update_id}:`);
        const e = err.error;
        console.error("Error in request:", e);
    });
}
