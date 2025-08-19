
'use server';
/**
 * @fileOverview Handles chat interactions from a Telegram bot.
 *
 * - telegramChat - A function that processes a message from Telegram.
 * - TelegramChatInput - The input type for the telegramChat function.
 * - TelegramChatOutput - The return type for the telegramChat function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

export const TelegramChatInputSchema = z.object({
  message: z.string().describe('The message from the Telegram user.'),
  userId: z.string().optional().describe('The Telegram user ID.'),
});
export type TelegramChatInput = z.infer<typeof TelegramChatInputSchema>;

export const TelegramChatOutputSchema = z.object({
  reply: z.string().describe('The response to send back to the user.'),
});
export type TelegramChatOutput = z.infer<typeof TelegramChatOutputSchema>;

export async function telegramChat(input: TelegramChatInput): Promise<TelegramChatOutput> {
  return telegramChatFlow(input);
}

const telegramChatFlow = ai.defineFlow(
  {
    name: 'telegramChatFlow',
    inputSchema: TelegramChatInputSchema,
    outputSchema: TelegramChatOutputSchema,
  },
  async ({ message, userId }) => {
    // For now, this is a simple echo, but it can be expanded.
    // In the future, it will use tools to interact with goals, schedule, etc.
    const llmResponse = await ai.generate({
      model: 'googleai/gemini-pro',
      prompt: `You are an AI assistant for a productivity app called Zenith Flow. A user is messaging you from Telegram.

User message: "${message}"

Keep your response concise and helpful. If the user ID is available, you can use tools in the future. User ID: ${userId || 'Not provided'}.`,
    });

    return {
      reply: llmResponse.text,
    };
  }
);
