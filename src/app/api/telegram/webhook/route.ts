
import { webhookCallback } from "grammy";
import { bot } from "@/lib/telegram-bot";

// Ensures that every request is handled dynamically and not cached.
export const dynamic = 'force-dynamic';

if (!bot) {
  throw new Error("Bot not initialized!");
}

// Export the webhook handler for POST requests
export const POST = webhookCallback(bot, "next-js");
