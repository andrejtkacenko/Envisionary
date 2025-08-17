'use server';

/**
 * @fileOverview Suggests goals based on a given topic.
 *
 * - suggestGoals - A function that suggests goals.
 * - SuggestGoalsInput - The input type for the suggestGoals function.
 * - SuggestGoalsOutput - The return type for the suggestGoals function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestGoalsInputSchema = z.object({
  topic: z.string().describe('The topic for which to suggest goals.'),
});
export type SuggestGoalsInput = z.infer<typeof SuggestGoalsInputSchema>;

const SuggestedGoalSchema = z.object({
    title: z.string().describe('The title of the suggested goal.'),
    description: z.string().describe('A brief description of the suggested goal.'),
});

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
  prompt: `You are a productivity assistant. Your task is to suggest 6 achievable goals for a user based on a given topic. For each goal, provide a clear title and a one-sentence description.

Topic: {{{topic}}}`,
});

const suggestGoalsFlow = ai.defineFlow(
  {
    name: 'suggestGoalsFlow',
    inputSchema: SuggestGoalsInputSchema,
    outputSchema: SuggestGoalsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
