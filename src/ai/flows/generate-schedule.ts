
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
  preferences: z.string().optional().describe("User preferences, e.g., 'Main Goals: Career Growth. Energy Peak: morning. I prefer creative work in the morning.'"),
});
export type GenerateScheduleInput = z.infer<typeof GenerateScheduleInputSchema>;


const ScheduledItemSchema = z.object({
    taskId: z.string().optional().describe("The ID of the task being scheduled. This is required if the item is from the user's task list. For generic, AI-generated items like 'Lunch' or 'Workout', this field should be omitted."),
    title: z.string().describe("The title of the event or task."),
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
  prompt: `You are a world-class productivity and life coach. Your task is to create a holistic, realistic, and productive weekly schedule. This is not just a task list; it's a full-day plan that includes work, rest, meals, and personal activities.

**Instructions:**
1.  **Establish Core Blocks**: First, block out time for non-negotiable activities based on user preferences. This includes sleep, work/school hours, and meals (breakfast, lunch, dinner). These are the foundation of the schedule.
2.  **Analyze Tasks & Preferences**: Review the list of tasks, their priorities, and the user's preferences (goals, energy peaks, workout times).
3.  **Prioritize & Theme Days**: Schedule higher priority tasks (p1) first. If possible, group similar tasks together on certain days (e.g., "Deep Work Wednesday").
4.  **Energy Management**: Schedule the most demanding, high-focus tasks (p1/p2) during the user's specified energy peak. Use lower-energy times for administrative tasks, emails, or easier work.
5.  **Create the Schedule**: Intelligently place the user's tasks and desired activities (like workouts or learning) into the available slots around the core blocks.
6.  **Estimate Duration**: For each task, estimate a realistic duration in minutes. Simple tasks might take 15-30 minutes, complex ones 60-90+. Be realistic.
7.  **Add Breaks**: Automatically insert short 10-15 minute breaks between tasks to prevent burnout. Ensure a longer lunch break is present.
8.  **Fill the Gaps**: If there are empty slots, suggest and schedule beneficial activities based on the user's stated goals (e.g., "Review progress on [Goal]", "Read for 30 minutes", "Tidy workspace", "Plan tomorrow"). These should be generic and not have a taskId.
9.  **Format the Output**: Structure the response according to the JSON schema. Ensure all times are in HH:MM format and dates are in YYYY-MM-DD. Every day from the start date to the end date should have a schedule, even if it's just sleep and meals on a weekend.
10. **Task IDs**: When you include a task from the input list, you MUST use its original \`taskId\`. For generic, self-generated items like "Lunch" or "Workout", do NOT include a \`taskId\`.

**User Profile & Constraints:**
- **Schedule for**: From {{{scheduleStartDate}}} to {{{scheduleEndDate}}}
- **User Preferences & Profile**: {{{preferences}}}

**Tasks to Schedule:**
{{#each tasks}}
- **Task ID**: {{id}}
  - **Title**: {{title}}
  - **Description**: {{description}}
  - **Priority**: {{priority}}
{{/each}}

Now, generate the ideal and complete weekly schedule. Be thoughtful and act as a true coach.
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
