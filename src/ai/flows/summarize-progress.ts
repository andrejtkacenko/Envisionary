'use server';

/**
 * @fileOverview Summarizes the overall progress on all goals.
 *
 * - summarizeProgress - A function that summarizes the overall progress on all goals.
 * - SummarizeProgressInput - The input type for the summarizeProgress function.
 * - SummarizeProgressOutput - The return type for the summarizeProgress function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeProgressInputSchema = z.object({
  tasks: z
    .string()
    .describe(
      'A list of goals with their status. Make sure to include all goals in the list.'
    ),
});
export type SummarizeProgressInput = z.infer<typeof SummarizeProgressInputSchema>;

const SummarizeProgressOutputSchema = z.object({
  summary: z.string().describe('A summary of the overall progress on all goals.'),
});
export type SummarizeProgressOutput = z.infer<typeof SummarizeProgressOutputSchema>;

export async function summarizeProgress(input: SummarizeProgressInput): Promise<SummarizeProgressOutput> {
  return summarizeProgressFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeProgressPrompt',
  input: {schema: SummarizeProgressInputSchema},
  output: {schema: SummarizeProgressOutputSchema},
  prompt: `You are a personal assistant helping a user understand their progress on their goals.\n\nYou will be provided with a list of goals and their status. You will generate a summary of the user's overall progress on all of them.\n\nGoals: {{{tasks}}}`,
});

const summarizeProgressFlow = ai.defineFlow(
  {
    name: 'summarizeProgressFlow',
    inputSchema: SummarizeProgressInputSchema,
    outputSchema: SummarizeProgressOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
