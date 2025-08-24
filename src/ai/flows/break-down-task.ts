'use server';

/**
 * @fileOverview Breaks down a complex task into smaller, actionable sub-tasks.
 *
 * - breakDownTask - A function that breaks down a task.
 * - BreakDownTaskInput - The input type for the breakDownTask function.
 * - BreakDownTaskOutput - The return type for the breakDownTask function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const BreakDownTaskInputSchema = z.object({
  title: z.string().describe('The title of the task to break down.'),
  description: z.string().optional().describe('The description of the task.'),
});
export type BreakDownTaskInput = z.infer<typeof BreakDownTaskInputSchema>;

const SubTaskSchema = z.object({
    title: z.string().describe('The title of the sub-task.'),
    description: z.string().describe('A brief, one-sentence description of the sub-task.'),
});

const BreakDownTaskOutputSchema = z.object({
  subTasks: z.array(SubTaskSchema).describe('A list of suggested sub-tasks.'),
});
export type BreakDownTaskOutput = z.infer<typeof BreakDownTaskOutputSchema>;

export async function breakDownTask(input: BreakDownTaskInput): Promise<BreakDownTaskOutput> {
  return breakDownTaskFlow(input);
}

const prompt = ai.definePrompt({
  name: 'breakDownTaskPrompt',
  input: {schema: BreakDownTaskInputSchema},
  output: {schema: BreakDownTaskOutputSchema},
  prompt: `You are a productivity expert. Your job is to break down a larger task into smaller, concrete, and actionable sub-tasks. For each sub-task, provide a clear title and a brief description.

Task Title: {{{title}}}
{{#if description}}
Task Description: {{{description}}}
{{/if}}

Generate a list of sub-tasks to accomplish this main task.
`,
});

const breakDownTaskFlow = ai.defineFlow(
  {
    name: 'breakDownTaskFlow',
    inputSchema: BreakDownTaskInputSchema,
    outputSchema: BreakDownTaskOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
