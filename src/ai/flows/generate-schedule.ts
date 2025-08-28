
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
  preferences: z.string().optional().describe("User preferences, e.g., 'Main Goals: Career Growth. Energy Peak: morning. I prefer creative work in the morning.'"),
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
  schedule: z.array(DailyScheduleSchema).describe('The generated weekly schedule, with one entry per day.'),
});
export type GenerateScheduleOutput = z.infer<typeof GenerateScheduleOutputSchema>;

export async function generateSchedule(input: GenerateScheduleInput): Promise<GenerateScheduleOutput> {
  return generateScheduleFlow(input);
}


const prompt = ai.definePrompt({
  name: 'generateSchedulePrompt',
  input: { schema: GenerateScheduleInputSchema },
  output: { schema: GenerateScheduleOutputSchema },
  prompt: `You are a world-class productivity coach and AI assistant. Your task is to create an optimal, realistic, and productive weekly schedule based on a list of tasks and user preferences.

**Instructions:**
1.  **Analyze Tasks & Preferences**: Review the list of tasks, their priorities, and the user's preferences (goals, energy peaks).
2.  **Prioritize & Theme Days**: Schedule higher priority tasks first. If possible, group similar tasks together on certain days (e.g., "Deep Work Wednesday").
3.  **Energy Management**: If the user specified an energy peak (e.g., 'morning'), schedule the most demanding tasks (p1/p2) during that time.
4.  **Create the Schedule**: Arrange the tasks within the user's specified timeframe (from scheduleStartDate to scheduleEndDate) and workday (startTime to endTime).
5.  **Estimate Duration**: For each task, estimate a realistic duration in minutes. Simple tasks might take 15-30 minutes, complex ones 60-90+.
6.  **Add Breaks**: Automatically insert 10-15 minute breaks between tasks. Include a longer break (45-60 minutes) for lunch around noon each day.
7.  **Fill the Gaps**: If there are empty slots, you can suggest activities based on the user's stated goals (e.g., "Review progress on [Goal]", "Read for 30 minutes"). These should be generic and not have a taskId.
8.  **Format the Output**: Structure the response according to the JSON schema. Ensure all times are in HH:MM format and dates are in YYYY-MM-DD.

**User Profile & Constraints:**
- **Schedule for**: From {{{scheduleStartDate}}} to {{{scheduleEndDate}}}
- **Working Hours**: From {{{startTime}}} to {{{endTime}}} daily.
- **User Preferences**: {{{preferences}}}

**Tasks to Schedule:**
{{#each tasks}}
- **Task ID**: {{id}}
  - **Title**: {{title}}
  - **Description**: {{description}}
  - **Priority**: {{priority}}
{{/each}}

Now, generate the ideal weekly schedule.
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
