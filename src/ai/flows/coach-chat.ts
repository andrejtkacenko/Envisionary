
'use server';

/**
 * @fileOverview A conversational AI coach.
 *
 * - coachChat - A function that handles the chat conversation.
 * - CoachChatInput - The input type for the coachChat function.
 * - CoachChatOutput - The return type for the coachChat function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ChatMessageSchema = z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
});

const CoachChatInputSchema = z.object({
  history: z.array(ChatMessageSchema).describe('The chat history.'),
  message: z.string().describe('The latest user message.'),
});
export type CoachChatInput = z.infer<typeof CoachChatInputSchema>;

const CoachChatOutputSchema = z.object({
  response: z.string().describe('The AI coach\'s response.'),
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
  async ({history, message}) => {
    
    const response = await ai.generate({
        model: 'googleai/gemini-2.0-flash',
        system: "You are an AI coach named Zenith Flow. Your goal is to help users achieve their goals by providing supportive, insightful, and actionable advice. Keep your responses concise and encouraging.",
        history: history.map(m => ({...m, role: m.role === 'assistant' ? 'model' : m.role})),
        prompt: message,
    });

    return { response: response.text };
  }
);
