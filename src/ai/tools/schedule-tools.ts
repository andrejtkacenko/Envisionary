'use server';

/**
 * @fileOverview Defines Genkit tools for interacting with user schedules in Firestore.
 * This file should only define the tools and not export them directly for client use.
 * The actions in schedule-actions.ts are the public API for the client.
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