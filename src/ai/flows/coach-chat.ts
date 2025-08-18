
'use server';

/**
 * @fileOverview A conversational AI coach that can interact with user goals.
 *
 * - coachChat - A function that handles the chat conversation.
 * - CoachChatInput - The input type for the coachChat function.
 * - CoachChatOutput - The return type for the coachChat function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { createGoalTool, updateGoalTool, findGoalsTool } from '@/ai/tools/goal-tools';
import type { Goal } from '@/types';

const ChatMessageSchema = z.object({
    role: z.enum(['user', 'assistant', 'tool']),
    content: z.string(),
    toolResult: z.any().optional(),
    toolRequest: z.any().optional(),
});

const CoachChatInputSchema = z.object({
  history: z.array(ChatMessageSchema).describe('The chat history.'),
  message: z.string().describe('The latest user message.'),
  userId: z.string().describe('The ID of the current user.'),
});
export type CoachChatInput = z.infer<typeof CoachChatInputSchema>;

const CoachChatOutputSchema = z.object({
  response: z.string().describe('The AI coach\'s response.'),
  toolRequest: z.any().optional().describe('A request from the AI to call a tool.'),
});
export type CoachChatOutput = z.infer<typeof CoachChatOutputSchema>;


export async function coachChat(input: CoachChatInput): Promise<CoachChatOutput> {
  return coachChatFlow(input);
}

const coachChatFlow = ai.defineFlow(
  {
    name: 'coachChatFlow',
    inputSchema: CoachChatInputSchema,
    outputSchema: CoachChatOutputSchema,
  },
  async ({history, message, userId}) => {

    const augmentedHistory = history.map(m => {
        const historyMessage: any = {
            role: m.role === 'assistant' ? 'model' : m.role,
            content: []
        };
        if (m.toolRequest) {
            historyMessage.content.push({toolRequest: m.toolRequest});
        }
        if (m.toolResult) {
            historyMessage.content.push({toolResult: m.toolResult});
        }
        if (m.content) {
            historyMessage.content.push({text: m.content});
        }
        return historyMessage;
    });

    const response = await ai.generate({
        model: 'googleai/gemini-2.0-flash',
        tools: [createGoalTool, updateGoalTool, findGoalsTool],
        toolConfig: {
            // By default, the model will decide when to call tools.
            // You can also force it to call a specific tool or none at all.
        },
        system: `You are an AI coach named Zenith Flow. Your goal is to help users achieve their goals by providing supportive, insightful, and actionable advice. Keep your responses concise and encouraging.

You have access to tools to help the user manage their goals.
- When a user asks you to create a goal, use the createGoalTool.
- When a user asks you to improve or modify a goal, first find the goal using the findGoalsTool to get the goal's ID, then use the updateGoalTool to make the changes. Always confirm with the user before updating a goal.
- You must have the user's ID to use any tool.
- You can only see the user's goals by using the findGoalsTool.
- The user's ID is: ${userId}`,
        history: augmentedHistory,
        prompt: message,
    });
    
    const toolRequest = response.toolRequest();
    if (toolRequest) {
        return {
            response: response.text,
            toolRequest: toolRequest,
        };
    }
    
    return { response: response.text };
  }
);
