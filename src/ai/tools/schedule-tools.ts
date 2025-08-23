'use server';

/**
 * @fileOverview Defines Genkit tools for interacting with user schedules in Firestore.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getSchedule as getScheduleFromDb } from '@/lib/goals-service';
import type { WeeklySchedule } from '@/types';

// Schema for getting the user's schedule
const GetScheduleSchema = z.object({
    userId: z.string().describe("The ID of the user whose schedule is being requested."),
});

/**
 * A Genkit tool that retrieves the user's weekly schedule.
 */
export const getScheduleTool = ai.defineTool(
    {
        name: 'getSchedule',
        description: 'Retrieves the current weekly schedule for a user.',
        inputSchema: GetScheduleSchema,
        outputSchema: z.custom<WeeklySchedule | null>(),
    },
    async ({ userId }) => {
        console.log(`[Tool] getSchedule called for user: ${userId}`);
        const schedule = await getScheduleFromDb(userId);
        return schedule;
    }
);

/**
 * An async function that can be called directly to get the schedule.
 */
export async function getSchedule(input: z.infer<typeof GetScheduleSchema>): Promise<WeeklySchedule | null> {
    return getScheduleTool(input);
}
