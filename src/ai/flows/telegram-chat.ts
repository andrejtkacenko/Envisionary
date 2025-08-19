
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
import { createGoalTool, findGoalsTool } from '@/ai/tools/goal-tools';

const ChatMessageSchema = z.object({
    role: z.enum(['user', 'assistant', 'tool']),
    content: z.string(),
    toolResult: z.any().optional(),
    toolRequest: z.any().optional(),
});

export const TelegramChatInputSchema = z.object({
  message: z.string().describe('The message from the Telegram user.'),
  userId: z.string().describe('The Telegram user ID.'),
  history: z.array(ChatMessageSchema).optional().describe('The chat history.'),
});
export type TelegramChatInput = z.infer<typeof TelegramChatInputSchema>;

export const TelegramChatOutputSchema = z.object({
  reply: z.string().describe('The response to send back to the user.'),
  toolRequest: z.any().optional().describe('A request from the AI to call a tool.'),
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
  async ({ message, userId, history }) => {
    
    const augmentedHistory = history?.map(m => {
        const historyMessage: any = {
            role: m.role === 'assistant' ? 'model' : 'tool', // Treat tool results as 'tool' role
            content: []
        };
        if (m.toolRequest) {
            historyMessage.role = 'model';
            historyMessage.content.push({toolRequest: m.toolRequest});
            if (m.content) historyMessage.content.push({text: m.content});
        } else if (m.toolResult) {
            historyMessage.role = 'tool';
            historyMessage.content.push({toolResult: m.toolResult});
        } else {
             historyMessage.role = m.role === 'assistant' ? 'model' : 'user';
             historyMessage.content.push({text: m.content});
        }
        return historyMessage;
    }) || [];

    const llmResponse = await ai.generate({
      model: 'googleai/gemini-2.0-flash',
      tools: [createGoalTool, findGoalsTool],
      system: `You are an AI assistant for a productivity app called Zenith Flow, interacting with a user via Telegram.
Your primary role is to help the user manage their goals.
- Use the createGoalTool to create new goals when the user asks. For example, if the user says "create a goal to learn piano", call the tool with the title "learn piano".
- Use the findGoalsTool to find and list goals when the user asks about their current tasks.
- You must have the user's ID to use any tool.
- The user's ID is: ${userId}
- When you use a tool, you will get the result back. Use that result to formulate your final response to the user. For example, after createGoal, respond with "Goal created: [goal title]". After findGoals, list the goals you found.`,
      history: augmentedHistory,
      prompt: message,
    });

    const toolRequest = llmResponse.toolRequest;
    if (toolRequest) {
        return {
            reply: ll.text, // The model might have some text before calling the tool
            toolRequest: toolRequest,
        };
    }

    return {
      reply: llmResponse.text,
    };
  }
);
