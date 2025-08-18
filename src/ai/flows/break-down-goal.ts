'use server';

/**
 * @fileOverview Breaks down a goal into smaller, actionable sub-goals.
 *
 * - breakDownGoal - A function that breaks down a goal.
 * - BreakDownGoalInput - The input type for the breakDownGoal function.
 * - BreakDownGoalOutput - The return type for the breakDownGoal function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const BreakDownGoalInputSchema = z.object({
  title: z.string().describe('The title of the goal to break down.'),
  description: z.string().optional().describe('The description of the goal.'),
});
export type BreakDownGoalInput = z.infer<typeof BreakDownGoalInputSchema>;

const SubGoalSchema = z.object({
    title: z.string().describe('The title of the sub-goal.'),
    description: z.string().describe('A brief description of the sub-goal.'),
    estimatedTime: z.string().describe('An estimation of how long the sub-goal will take to complete (e.g., "30 minutes", "2 hours").'),
});

const BreakDownGoalOutputSchema = z.object({
  subGoals: z.array(SubGoalSchema).describe('A list of suggested sub-goals with time estimates.'),
});
export type BreakDownGoalOutput = z.infer<typeof BreakDownGoalOutputSchema>;

export async function breakDownGoal(input: BreakDownGoalInput): Promise<BreakDownGoalOutput> {
  return breakDownGoalFlow(input);
}

const prompt = ai.definePrompt({
  name: 'breakDownGoalPrompt',
  input: {schema: BreakDownGoalInputSchema},
  output: {schema: BreakDownGoalOutputSchema},
  prompt: `You are a productivity expert. Your task is to break down a complex goal into smaller, actionable sub-goals. For each sub-goal, provide a clear title, a one-sentence description, and an estimated time to complete it.

Goal Title: {{{title}}}
{{#if description}}
Goal Description: {{{description}}}
{{/if}}
`,
});

const breakDownGoalFlow = ai.defineFlow(
  {
    name: 'breakDownGoalFlow',
    inputSchema: BreakDownGoalInputSchema,
    outputSchema: BreakDownGoalOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
