'use server';

/**
 * @fileOverview Suggests goals based on a topic.
 *
 * - suggestGoals - A function that suggests goals based on a topic.
 * - SuggestGoalsInput - The input type for the suggestGoals function.
 * - SuggestGoalsOutput - The return type for the suggestGoals function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

export const SuggestedGoalSchema = z.object({
  title: z.string().describe('The title of the suggested goal.'),
  description: z.string().describe('A brief description of the suggested goal.'),
  project: z.string().describe('The suggested project for this goal.'),
});
export type SuggestedGoal = z.infer<typeof SuggestedGoalSchema>;

const SuggestGoalsInputSchema = z.object({
  topic: z.string().describe('The topic or area of focus for which to suggest goals.'),
});
export type SuggestGoalsInput = z.infer<typeof SuggestGoalsInputSchema>;

const SuggestGoalsOutputSchema = z.object({
  suggestions: z.array(SuggestedGoalSchema).describe('A list of suggested goals.'),
});
export type SuggestGoalsOutput = z.infer<typeof SuggestGoalsOutputSchema>;

export async function suggestGoals(input: SuggestGoalsInput): Promise<SuggestGoalsOutput> {
  return suggestGoalsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestGoalsPrompt',
  input: {schema: SuggestGoalsInputSchema},
  output: {schema: SuggestGoalsOutputSchema},
  prompt: `You are a productivity assistant. Your task is to suggest a few achievable and well-defined goals based on a topic provided by the user.

Provide 3 suggestions. For each suggestion, provide a clear, actionable title, a brief description, and a relevant project name.

Topic: {{{topic}}}`,
});

const suggestGoalsFlow = ai.defineFlow(
  {
    name: 'suggestGoalsFlow',
    inputSchema: SuggestGoalsInputSchema,
    outputSchema: SuggestGoalsOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    return output!;
  }
);
