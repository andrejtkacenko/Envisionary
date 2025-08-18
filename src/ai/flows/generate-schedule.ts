
'use server';

/**
 * @fileOverview Generates a weekly schedule based on user inputs.
 *
 * - generateSchedule - A function that generates the schedule.
 * - GenerateScheduleInput - The input type for the generateSchedule function.
 * - GenerateScheduleOutput - The return type for the generateSchedule function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { DailyGoal, DailySchedule, GenerateScheduleInput, GenerateScheduleOutput } from '@/types';


export async function generateSchedule(input: GenerateScheduleInput): Promise<GenerateScheduleOutput> {
  return generateScheduleFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateSchedulePrompt',
  input: {schema: z.custom<GenerateScheduleInput>()},
  output: {schema: z.custom<GenerateScheduleOutput>()},
  prompt: `You are a productivity expert who specializes in creating optimized weekly schedules. Your task is to generate a detailed, hour-by-hour schedule for a user from Monday to Sunday based on their inputs.

Analyze the user's daily goals, which may include estimated times, along with their time constraints and overall priorities. Create a balanced and realistic schedule.

**Inputs:**
- **Daily Goals:**
{{#each dailyGoals}}
  - {{day}}:
  {{#each tasks}}
    - Task: "{{title}}"{{#if estimatedTime}} (Estimated Time: {{estimatedTime}}){{/if}}
  {{/each}}
{{/each}}
- **Time Constraints:** {{{timeConstraints}}}
- **Priorities:** {{{priorities}}}

**Instructions:**
1.  Create a schedule for all 7 days of the week (Monday to Sunday).
2.  For each day, provide a list of scheduled items with a unique ID, a specific time range (e.g., "08:00 AM - 09:00 AM"), the task, and a priority level.
3.  Incorporate the daily goals into the schedule, paying close attention to any provided time estimates to allocate the correct amount of time.
4.  Respect all specified time constraints.
5.  Align the schedule with the user's stated priorities.
6.  Ensure the schedule is realistic and includes breaks (e.g., Lunch Break).
7.  If a day has no specified tasks, create a reasonable schedule with common activities like meals, relaxation, or light work.
`,
});

const generateScheduleFlow = ai.defineFlow(
  {
    name: 'generateScheduleFlow',
    inputSchema: z.custom<GenerateScheduleInput>(),
    outputSchema: z.custom<GenerateScheduleOutput>(),
  },
  async input => {
    const {output} = await prompt(input);
    if (output) {
        output.weeklySchedule.forEach(day => {
            day.schedule.forEach(item => {
                // Failsafe: Ensure every item has a unique ID, even if the model forgets.
                if (!item.id) {
                    item.id = crypto.randomUUID();
                }
            });
        });
    }
    return output!;
  }
);
