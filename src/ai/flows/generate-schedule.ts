
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

const DailyGoalSchema = z.object({
  day: z.string().describe('The day of the week (e.g., Monday).'),
  tasks: z.string().describe('A comma-separated list of tasks or goals for that day.'),
});

const ScheduledItemSchema = z.object({
    id: z.string().describe('A unique ID for the scheduled item.'),
    time: z.string().describe('The suggested time for the activity (e.g., "09:00 AM - 10:00 AM").'),
    task: z.string().describe('The name of the task or activity.'),
    priority: z.enum(["low", "medium", "high"]).optional().describe('The priority of the task.'),
});

const DailyScheduleSchema = z.object({
  day: z.string().describe('The day of the week.'),
  schedule: z.array(ScheduledItemSchema).describe('The schedule for the day.'),
});


const GenerateScheduleInputSchema = z.object({
  dailyGoals: z.array(DailyGoalSchema).describe('A list of goals for each day of the week.'),
  timeConstraints: z.string().optional().describe('Any general time constraints, e.g., "Work 9am-5pm", "Free on weekends".'),
  priorities: z.string().optional().describe('Overall priorities for the week, e.g., "Focus on health", "Complete the project".'),
});
export type GenerateScheduleInput = z.infer<typeof GenerateScheduleInputSchema>;


const GenerateScheduleOutputSchema = z.object({
  weeklySchedule: z.array(DailyScheduleSchema).describe('The generated schedule for the entire week.'),
});
export type GenerateScheduleOutput = z.infer<typeof GenerateScheduleOutputSchema>;


export async function generateSchedule(input: GenerateScheduleInput): Promise<GenerateScheduleOutput> {
  return generateScheduleFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateSchedulePrompt',
  input: {schema: GenerateScheduleInputSchema},
  output: {schema: GenerateScheduleOutputSchema},
  prompt: `You are a productivity expert who specializes in creating optimized weekly schedules. Your task is to generate a detailed, hour-by-hour schedule for a user from Monday to Sunday based on their inputs.

Analyze the user's daily goals, time constraints, and overall priorities. Create a balanced and realistic schedule.

**Inputs:**
- **Daily Goals:**
{{#each dailyGoals}}
  - {{day}}: {{tasks}}
{{/each}}
- **Time Constraints:** {{{timeConstraints}}}
- **Priorities:** {{{priorities}}}

**Instructions:**
1.  Create a schedule for all 7 days of the week (Monday to Sunday).
2.  For each day, provide a list of scheduled items with a unique ID, a specific time range (e.g., "08:00 AM - 09:00 AM"), the task, and a priority level.
3.  Incorporate the daily goals into the schedule.
4.  Respect all specified time constraints.
5.  Align the schedule with the user's stated priorities.
6.  Ensure the schedule is realistic and includes breaks (e.g., Lunch Break).
7.  If a day has no specified tasks, create a reasonable schedule with common activities like meals, relaxation, or light work.
`,
});

const generateScheduleFlow = ai.defineFlow(
  {
    name: 'generateScheduleFlow',
    inputSchema: GenerateScheduleInputSchema,
    outputSchema: GenerateScheduleOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (output) {
        output.weeklySchedule.forEach(day => {
            day.schedule.forEach(item => {
                if (!item.id) {
                    item.id = crypto.randomUUID();
                }
            });
        });
    }
    return output!;
  }
);
