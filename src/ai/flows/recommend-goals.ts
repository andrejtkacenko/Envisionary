
'use server';

/**
 * @fileOverview Recommends new goals based on a user's existing goals.
 *
 * - recommendGoals - A function that recommends goals.
 * - RecommendGoalsInput - The input type for the recommendGoals function.
 * - RecommendGoalsOutput - The return type for the recommendGoals function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const RecommendGoalsInputSchema = z.object({
  existingGoals: z
    .string()
    .describe(
      'A list of the user\'s current goals with their status and priority.'
    ),
});
export type RecommendGoalsInput = z.infer<typeof RecommendGoalsInputSchema>;

const RecommendedGoalSchema = z.object({
    title: z.string().describe('The title of the suggested goal.'),
    description: z.string().describe('A brief description of the suggested goal.'),
    project: z.string().describe('A suggested project category for the goal.'),
    priority: z.enum(["low", "medium", "high"]).describe('The suggested priority for the goal.'),
});

const RecommendGoalsOutputSchema = z.object({
  recommendations: z.array(RecommendedGoalSchema).describe('A list of recommended goals.'),
});
export type RecommendGoalsOutput = z.infer<typeof RecommendGoalsOutputSchema>;

export async function recommendGoals(input: RecommendGoalsInput): Promise<RecommendGoalsOutput> {
  return recommendGoalsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'recommendGoalsPrompt',
  input: {schema: RecommendGoalsInputSchema},
  output: {schema: RecommendGoalsOutputSchema},
  prompt: `You are a productivity expert and AI coach. Your task is to analyze a user's existing goals and recommend 3 new, relevant goals that would complement their current efforts or help them in related areas.

For each recommendation, provide a clear title, a one-sentence description, a relevant project category, and a suggested priority.

Analyze the following goals:
{{{existingGoals}}}

Based on these goals, suggest the next logical steps or related goals.
`,
});

const recommendGoalsFlow = ai.defineFlow(
  {
    name: 'recommendGoalsFlow',
    inputSchema: RecommendGoalsInputSchema,
    outputSchema: RecommendGoalsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
