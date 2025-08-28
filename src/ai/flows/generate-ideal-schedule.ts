
'use server';
/**
 * @fileOverview A flow that generates a personalized, ideal weekly schedule based on user's productivity profile.
 */
import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateIdealScheduleInputSchema = z.object({
  mainGoals: z.string().describe("User's main goals for the week/month."),
  priorities: z.string().describe("User's main life priorities (e.g., Work, Study, Personal)."),
  sleepHours: z.string().describe("How many hours of sleep the user needs per night."),
  energyPeak: z.enum(["morning", "afternoon", "evening"]).describe("When the user's energy levels are at their peak."),
  fixedEvents: z.string().optional().describe("Any fixed events or appointments the user has (e.g., 'Team meeting every Monday at 10 AM')."),
  pastObstacles: z.string().optional().describe("User's biggest time-wasters or obstacles."),
  selfCare: z.string().optional().describe("User's preferred self-care and leisure activities."),
});
export type GenerateIdealScheduleInput = z.infer<typeof GenerateIdealScheduleInputSchema>;


const ScheduledItemSchema = z.object({
    taskId: z.string().describe("A unique ID for the task, can be a slug (e.g., 'deep-work-1')."),
    title: z.string().describe("The title of the task or event."),
    startTime: z.string().describe("The scheduled start time in HH:MM format (e.g., '09:00')."),
    endTime: z.string().describe("The scheduled end time in HH:MM format (e.g., '10:30')."),
    duration: z.number().describe("The duration of the task in minutes."),
});

const DailyScheduleSchema = z.object({
    date: z.string().describe("The date of the schedule in YYYY-MM-DD format, starting from next Monday."),
    items: z.array(ScheduledItemSchema).describe("The list of scheduled items for the day."),
});


const GenerateIdealScheduleOutputSchema = z.object({
  schedule: z.array(DailyScheduleSchema).describe('The generated weekly schedule, with one entry per day for the next 7 days.'),
  recommendations: z.array(z.string()).describe("A list of 3-5 actionable recommendations based on the user's profile to improve their productivity."),
});
export type GenerateIdealScheduleOutput = z.infer<typeof GenerateIdealScheduleOutputSchema>;

export async function generateIdealSchedule(input: GenerateIdealScheduleInput): Promise<GenerateIdealScheduleOutput> {
  return generateIdealScheduleFlow(input);
}


const prompt = ai.definePrompt({
  name: 'generateIdealSchedulePrompt',
  input: { schema: GenerateIdealScheduleInputSchema },
  output: { schema: GenerateIdealScheduleOutputSchema },
  prompt: `You are a world-class productivity coach and AI assistant. Your task is to create a personalized, ideal, and actionable weekly schedule (for the next 7 days, starting from the upcoming Monday) based on the user's comprehensive productivity profile.

**User Profile Analysis:**
1.  **Goals & Priorities**: The user's main goals are {{{mainGoals}}} with a focus on {{{priorities}}}. The schedule must reflect this. Allocate significant, uninterrupted time blocks for tasks related to these goals.
2.  **Energy Management**: The user's energy peaks in the {{{energyPeak}}}. Schedule the most demanding and important tasks (deep work) during this period. Schedule lighter tasks, administrative work, or learning during lower energy periods.
3.  **Biological Needs**: The user requires {{{sleepHours}}} of sleep. Ensure the schedule reserves this time for rest and includes reasonable time for meals (e.g., 30-45 min for breakfast/lunch, 60 min for dinner).
4.  **Fixed Commitments**: Consider these fixed events: {{{fixedEvents}}}. Schedule around them.
5.  **Self-Care & Growth**: Integrate time for the user's preferred self-care activities: {{{selfCare}}}. Also include blocks for learning or hobbies if they align with goals.
6.  **Obstacle Mitigation**: The user's main obstacles are {{{pastObstacles}}}. Proactively schedule focus blocks or "no-distraction" time to counteract these.

**Schedule Generation Instructions:**
1.  **Create a 7-Day Plan**: Generate a schedule for the next 7 days, starting from the nearest upcoming Monday.
2.  **Time Blocking**: Use time blocking for everything. Every part of the day from waking up to sleeping should be accounted for.
3.  **Task Types**: Create specific blocks like "Deep Work on [Goal]", "Admin & Emails", "Learning [Skill]", "Lunch Break", "Workout", "Relax & Unwind".
4.  **Be Realistic**: Include buffer time between tasks (10-15 mins). Don't over-schedule. The plan should be challenging but achievable.
5.  **Actionable Recommendations**: Based on the user's profile, provide 3-5 high-impact, actionable recommendations to improve their productivity and well-being. For example: "Since you struggle with social media, schedule 3 specific 15-minute 'social media check' blocks per day." or "To align with your 'Career Growth' goal, dedicate your peak energy time on Mon/Wed/Fri to it."

**Output Format**:
- Generate the schedule according to the JSON schema.
- All dates must be in YYYY-MM-DD format.
- All times must be in HH:MM format.
- All durations must be in minutes.

Now, based on this detailed profile, generate the user's ideal weekly schedule and provide your expert recommendations.
`,
});


const generateIdealScheduleFlow = ai.defineFlow(
  {
    name: 'generateIdealScheduleFlow',
    inputSchema: GenerateIdealScheduleInputSchema,
    outputSchema: GenerateIdealScheduleOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
