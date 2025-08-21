
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

const GoalSchema = z.object({
    id: z.string(),
    title: z.string(),
    estimatedTime: z.string().optional(),
});

const GenerateScheduleTemplateInputSchema = z.object({
  description: z.string().describe('A description of the template to generate, e.g., "A productive work day" or "A relaxed weekend schedule".'),
  type: z.enum(['day', 'week']).describe('The type of template to generate.'),
  goals: z.array(GoalSchema).optional().describe('A list of existing user goals to incorporate into the schedule.'),
});
export type GenerateScheduleTemplateInput = z.infer<typeof GenerateScheduleTemplateInputSchema>;

const ScheduledItemSchema = z.object({
    id: z.string().describe('A unique ID for the scheduled item.'),
    time: z.string().describe('A specific time or time-range for the task (e.g., "09:00 AM - 10:00 AM" or "All Day").'),
    task: z.string().describe('A concise description of the task or event.'),
    priority: z.enum(["low", "medium", "high"]).optional().describe("The priority of the task, derived from the goal's priority if applicable."),
});

const DailyScheduleSchema = z.object({
  day: z.string().describe("The day of the week (e.g., 'Monday') or a descriptive title for a single day template (e.g., 'Productive Day')."),
  schedule: z.array(ScheduledItemSchema).describe('A list of scheduled items for that day.'),
});

const GenerateScheduleTemplateOutputSchema = z.object({
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
  prompt: `You are a productivity expert who creates optimized schedule templates. Your task is to generate a detailed, hour-by-hour schedule based on a user's description and their selected goals.

**Inputs:**
- **Description:** {{{description}}}
- **Template Type:** {{{type}}}
{{#if goals}}
- **Existing Goals to Incorporate:**
  {{#each goals}}
  - Task: "{{this.title}}"{{#if this.estimatedTime}} (Estimated Time: {{this.estimatedTime}}){{/if}}
  {{/each}}
{{/if}}

**Instructions:**
1. Based on the **Template Type**, create a schedule for either a single day or a full 7-day week (Monday to Sunday).
2.  If the user provided goals, intelligently distribute them throughout the schedule. Pay attention to any provided time estimates to allocate the correct amount of time. Create specific tasks related to these goals. For instance, if a goal is "Learn Spanish", a task could be "Practice Spanish vocabulary for 30 minutes".
3. For each day, provide a list of scheduled items with a unique ID, a specific time range (e.g., "08:00 AM - 09:00 AM"), a task description, and a priority level ('low', 'medium', or 'high').
4. The generated schedule should be realistic and include breaks (e.g., Lunch Break).
5. The output must be a valid JSON object matching the requested schema. Ensure every scheduled item has a unique 'id' field.
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
