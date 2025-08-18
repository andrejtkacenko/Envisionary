
'use server';

/**
 * @fileOverview Generates a schedule template (daily or weekly) based on a description.
 *
 * - generateScheduleTemplate - A function that generates the schedule template.
 * - GenerateScheduleTemplateInput - The input type for the function.
 * - GenerateScheduleTemplateOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { nanoid } from 'nanoid';
import type { DailySchedule } from '@/types';

const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export const GenerateScheduleTemplateInputSchema = z.object({
  description: z.string().describe('A description of the template to generate, e.g., "A productive work day" or "A relaxed weekend schedule".'),
  type: z.enum(['day', 'week']).describe('The type of template to generate.'),
});
export type GenerateScheduleTemplateInput = z.infer<typeof GenerateScheduleTemplateInputSchema>;

const ScheduledItemSchema = z.object({
    id: z.string(),
    time: z.string(),
    task: z.string(),
    priority: z.enum(["low", "medium", "high"]).optional(),
});

const DailyScheduleSchema = z.object({
  day: z.string(),
  schedule: z.array(ScheduledItemSchema),
});

export const GenerateScheduleTemplateOutputSchema = z.object({
  templateData: z.array(DailyScheduleSchema).describe("An array of daily schedules. For a 'day' template, it will contain one item. For a 'week' template, it will contain seven items."),
});
export type GenerateScheduleTemplateOutput = z.infer<typeof GenerateScheduleTemplateOutputSchema>;


export async function generateScheduleTemplate(input: GenerateScheduleTemplateInput): Promise<GenerateScheduleTemplateOutput> {
  return generateScheduleTemplateFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateScheduleTemplatePrompt',
  input: { schema: GenerateScheduleTemplateInputSchema },
  output: { schema: GenerateScheduleTemplateOutputSchema },
  prompt: `You are a productivity expert who creates optimized schedule templates. Your task is to generate a detailed, hour-by-hour schedule based on a user's description.

**Inputs:**
- **Description:** {{{description}}}
- **Template Type:** {{{type}}}

**Instructions:**
1. Based on the **Template Type**, create a schedule for either a single day or a full 7-day week (Monday to Sunday).
2. For each day, provide a list of scheduled items with a unique ID, a specific time range (e.g., "08:00 AM - 09:00 AM"), a task description, and a priority level ('low', 'medium', or 'high').
3. The generated schedule should be realistic and include breaks (e.g., Lunch Break).
4. The output must be a valid JSON object matching the requested schema.
`,
});

const generateScheduleTemplateFlow = ai.defineFlow(
  {
    name: 'generateScheduleTemplateFlow',
    inputSchema: GenerateScheduleTemplateInputSchema,
    outputSchema: GenerateScheduleTemplateOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (output) {
      // Ensure every item has a unique ID, even if the model forgets.
      output.templateData.forEach(day => {
        if (!day.day && input.type === 'day') {
          day.day = 'Template Day';
        }
        day.schedule.forEach(item => {
          if (!item.id) {
            item.id = nanoid();
          }
        });
      });
       // If a week was requested, ensure we have 7 days
      if (input.type === 'week' && output.templateData.length < 7) {
        const existingDays = output.templateData.map(d => d.day);
        for (const dayName of daysOfWeek) {
            if (!existingDays.includes(dayName)) {
                output.templateData.push({ day: dayName, schedule: [] });
            }
        }
      }
    }
    return output!;
  }
);
