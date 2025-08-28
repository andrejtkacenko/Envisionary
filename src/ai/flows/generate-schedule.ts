
'use server';
/**
 * @fileOverview A flow that generates a daily schedule based on a list of tasks.
 */
import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const TaskInputSchema = z.object({
    id: z.string().describe("Unique identifier for the task"),
    title: z.string().describe("The title of the task."),
    description: z.string().optional().describe("A brief description of the task."),
    priority: z.enum(["p1", "p2", "p3", "p4"]).describe("The priority of the task. p1 is highest."),
});


const GenerateScheduleInputSchema = z.object({
  tasks: z.array(TaskInputSchema).describe('A list of tasks to be scheduled.'),
  scheduleStartDate: z.string().describe("The start date for the schedule in ISO 8601 format."),
  scheduleEndDate: z.string().describe("The end date for the schedule in ISO 8601 format."),
  startTime: z.string().describe("The start time of the workday (e.g., '09:00')."),
  endTime: z.string().describe("The end time of the workday (e.g., '17:00')."),
  preferences: z.string().optional().describe("User preferences, e.g., 'I prefer to do creative work in the morning.'"),
});
export type GenerateScheduleInput = z.infer<typeof GenerateScheduleInputSchema>;


const ScheduledItemSchema = z.object({
    taskId: z.string().describe("The ID of the task being scheduled."),
    title: z.string().describe("The title of the task."),
    startTime: z.string().describe("The scheduled start time in HH:MM format (e.g., '09:00')."),
    endTime: z.string().describe("The scheduled end time in HH:MM format (e.g., '10:30')."),
    duration: z.number().describe("The duration of the task in minutes."),
});

const DailyScheduleSchema = z.object({
    date: z.string().describe("The date of the schedule in YYYY-MM-DD format."),
    items: z.array(ScheduledItemSchema).describe("The list of scheduled items for the day."),
});


const GenerateScheduleOutputSchema = z.object({
  schedule: z.array(DailyScheduleSchema).describe('The generated schedule, with one entry per day.'),
});
export type GenerateScheduleOutput = z.infer<typeof GenerateScheduleOutputSchema>;

export async function generateSchedule(input: GenerateScheduleInput): Promise<GenerateScheduleOutput> {
  return generateScheduleFlow(input);
}


const prompt = ai.definePrompt({
  name: 'generateSchedulePrompt',
  input: { schema: GenerateScheduleInputSchema },
  output: { schema: GenerateScheduleOutputSchema },
  prompt: `You are a productivity expert and AI assistant. Your task is to create an optimal, realistic, and productive daily schedule based on a list of tasks provided by the user.

**Instructions:**
1.  **Analyze the Tasks**: Review the list of tasks, paying close attention to their titles, descriptions, and priorities.
2.  **Estimate Duration**: For each task, estimate a realistic duration in minutes. Be reasonable; simple tasks might take 15-30 minutes, while complex ones could take 60-90 minutes or more.
3.  **Prioritize**: Schedule higher priority tasks (p1) earlier in the day to ensure they get done.
4.  **Create the Schedule**: Arrange the tasks within the user's specified workday (from startTime to endTime).
5.  **Add Breaks**: Automatically insert 10-15 minute breaks between tasks to prevent burnout. Also, include a longer break (45-60 minutes) for lunch around noon.
6.  **Format the Output**: Structure the response according to the provided JSON schema. Ensure all times are in HH:MM format. Calculate the duration for each task.

**User's Working Hours:**
- Start of day: {{{startTime}}}
- End of day: {{{endTime}}}

**Date to Schedule For:**
- From: {{{scheduleStartDate}}}
- To: {{{scheduleEndDate}}}

**User Preferences (if any):**
{{#if preferences}}
- {{{preferences}}}
{{else}}
- None provided.
{{/if}}

**Tasks to Schedule:**
{{#each tasks}}
- **Task ID**: {{id}}
  - **Title**: {{title}}
  - **Description**: {{description}}
  - **Priority**: {{priority}}
{{/each}}

Now, generate the ideal schedule.
`,
});


const generateScheduleFlow = ai.defineFlow(
  {
    name: 'generateScheduleFlow',
    inputSchema: GenerateScheduleInputSchema,
    outputSchema: GenerateScheduleOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
