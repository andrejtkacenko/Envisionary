'use server';

/**
 * @fileOverview Generates a schedule template based on a user's description.
 *
 * - generateScheduleTemplate - A function that generates the template.
 * - GenerateScheduleTemplateInput - The input type for the generateScheduleTemplate function.
 * - GenerateScheduleTemplateOutput - The return type for the generateScheduleTemplate function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { nanoid } from 'nanoid';
import type { DailySchedule } from '@/types';

const GenerateScheduleTemplateInputSchema = z.object({
    description: z.string().describe("A description of the kind of schedule to create (e.g., 'A productive work week', 'A relaxed weekend')."),
    type: z.enum(['day', 'week']).describe("The type of template to generate (a single day or a full week)."),
    goals: z.array(z.object({
        id: z.string(),
        title: z.string(),
        estimatedTime: z.string().optional(),
    })).optional().describe("A list of user's goals to be optionally included in the template."),
});
export type GenerateScheduleTemplateInput = z.infer<typeof GenerateScheduleTemplateInputSchema>;

const DailyScheduleSchema = z.object({
  day: z.string(),
  schedule: z.array(z.object({
    id: z.string(),
    time: z.string(),
    task: z.string(),
    priority: z.enum(['low', 'medium', 'high']),
  })),
});

const GenerateScheduleTemplateOutputSchema = z.object({
  templateData: z.array(DailyScheduleSchema).describe("The generated schedule data for the template."),
});
export type GenerateScheduleTemplateOutput = z.infer<typeof GenerateScheduleTemplateOutputSchema>;


export async function generateScheduleTemplate(input: GenerateScheduleTemplateInput): Promise<GenerateScheduleTemplateOutput> {
  return generateScheduleTemplateFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateScheduleTemplatePrompt',
  input: {schema: GenerateScheduleTemplateInputSchema},
  output: {schema: GenerateScheduleTemplateOutputSchema},
  prompt: `You are a productivity expert who creates reusable schedule templates. Generate a schedule based on the user's request.

**Template Request:**
- **Type:** {{type}}
- **Description:** {{description}}

**Optional Goals to Incorporate:**
{{#if goals}}
    {{#each goals}}
    - **{{title}}**{{#if estimatedTime}} (Estimated Time: {{estimatedTime}}){{/if}}
    {{/each}}
{{else}}
    - No specific goals provided.
{{/if}}

**Instructions:**
1.  **Generate a schedule** for the specified type ('day' or 'week'). If 'week', generate for Monday to Sunday. If 'day', generate a generic, ideal day.
2.  **Use Thematic Blocks:** Instead of specific, one-off tasks, use thematic blocks like "Deep Work Session", "Admin & Emails", "Creative Time", "Lunch Break", "Exercise", "Relaxation", "Family Time", etc.
3.  **Incorporate Goals:** If goals are provided, schedule time blocks to work on them. For example, if a goal is "Learn Guitar", you might add a block named "Practice: Learn Guitar".
4.  **Realistic & Balanced:** The schedule should be well-paced and include breaks.
5.  **Output Structure:** For each day, provide a list of scheduled items. Each item must have:
    - A unique \`id\` (string).
    - A specific time range (\`time\`, e.g., "09:00 AM - 11:00 AM").
    - The name of the \`task\` or block.
    - A \`priority\` level ("low", "medium", or "high").
`,
});

const generateScheduleTemplateFlow = ai.defineFlow(
  {
    name: 'generateScheduleTemplateFlow',
    inputSchema: GenerateScheduleTemplateInputSchema,
    outputSchema: GenerateScheduleTemplateOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (output) {
        // Failsafe: Ensure every item has a unique ID, even if the model forgets.
        output.templateData.forEach(day => {
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
