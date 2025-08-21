
'use server';

/**
 * @fileOverview Generates a weekly schedule based on user goals and personal preferences.
 *
 * - generateSchedule - A function that generates the schedule.
 * - GenerateScheduleInput - The input type for the generateSchedule function.
 * - GenerateScheduleOutput - The return type for the generateSchedule function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { nanoid } from 'nanoid';
import type { DailySchedule } from '@/types';

const GenerateScheduleInputSchema = z.object({
    goals: z.array(z.object({
        id: z.string(),
        title: z.string(),
        estimatedTime: z.string().optional(),
    })).describe("A list of user's goals to be included in the schedule."),
    preferences: z.object({
        workHours: z.string().describe("User's typical work or study hours (e.g., 9 AM - 5 PM)."),
        sleepHours: z.string().describe("User's typical sleep schedule (e.g., 11 PM - 7 AM)."),
        training: z.string().describe("User's training or exercise preferences (e.g., 3 times a week in the morning)."),
        meditation: z.string().describe("User's meditation or mindfulness preferences (e.g., 15 minutes daily)."),
        other: z.string().optional().describe("Any other constraints or preferences."),
    }).describe("User's personal preferences for scheduling."),
});
export type GenerateScheduleInput = z.infer<typeof GenerateScheduleInputSchema>;

const GenerateScheduleOutputSchema = z.object({
  weeklySchedule: z.array(z.custom<DailySchedule>()),
});
export type GenerateScheduleOutput = z.infer<typeof GenerateScheduleOutputSchema>;


export async function generateSchedule(input: GenerateScheduleInput): Promise<GenerateScheduleOutput> {
  return generateScheduleFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateSchedulePrompt',
  input: {schema: GenerateScheduleInputSchema},
  output: {schema: GenerateScheduleOutputSchema},
  prompt: `You are a world-class productivity expert and life coach. Your task is to generate a highly optimized, realistic, and balanced weekly schedule (Monday to Sunday) for a user based on their goals and personal preferences.

**User's Goals:**
{{#each goals}}
- **{{title}}**{{#if estimatedTime}} (Estimated Time: {{estimatedTime}}){{/if}}
{{/each}}
{{#if (eq goals.length 0)}}
- No specific goals provided. Create a balanced general wellness and productivity schedule.
{{/if}}

**User's Preferences:**
- **Work/Study Hours:** {{preferences.workHours}}
- **Sleep Schedule:** {{preferences.sleepHours}}
- **Training/Exercise:** {{preferences.training}}
- **Meditation/Mindfulness:** {{preferences.meditation}}
{{#if preferences.other}}
- **Other Notes:** {{preferences.other}}
{{/if}}

**Instructions:**
1.  **Create a full 7-day schedule** from Monday to Sunday.
2.  **Integrate Goals:** Intelligently schedule tasks related to the user's goals. Pay close attention to estimated times to allocate appropriate time blocks. If a goal seems large, break it down into smaller, logical tasks within the schedule (e.g., "Work on 'Launch a Blog': Draft post outline").
3.  **Incorporate Preferences:** Build the schedule around the user's stated work, sleep, training, and meditation habits. These are the fixed pillars of their week.
4.  **Balance & Realism:** Ensure the schedule is not overwhelming. Include time for meals (Breakfast, Lunch, Dinner), breaks, and relaxation/free time. A packed schedule is an ineffective one.
5.  **Structure the Output:** For each day, provide a list of scheduled items. Each item must have:
    - A unique \`id\` (string).
    - A specific time range (\`time\`, e.g., "08:00 AM - 09:00 AM").
    - The name of the \`task\`.
    - A \`priority\` level ("low", "medium", or "high"). High for critical tasks, medium for regular work, low for breaks/flexible items.
6.  **Be Smart:** If a user wants to train 3 times a week, spread it out (e.g., Mon, Wed, Fri). If they have daily meditation, schedule it at a consistent time, perhaps in the morning or evening.
7.  **Fill Gaps:** For any empty time slots, add reasonable default activities like "Review plans", "Tidy up workspace", or "Free time".
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
        // Failsafe: Ensure every item has a unique ID, even if the model forgets.
        output.weeklySchedule.forEach(day => {
            if (day.schedule) {
                day.schedule.forEach(item => {
                    if (!item.id) {
                        item.id = nanoid();
                    }
                });
            } else {
                day.schedule = [];
            }
        });
    }
    return output!;
  }
);
