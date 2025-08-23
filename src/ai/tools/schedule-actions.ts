'use server';

/**
 * @fileOverview Defines server actions for interacting with user schedules.
 * These actions are safe to call from client components.
 */

import { z } from 'genkit';
import type { WeeklySchedule } from '@/types';
import { getScheduleTool } from './schedule-tools';


const GetScheduleSchema = z.object({
    userId: z.string().describe("The ID of the user whose schedule is being requested."),
});

/**
 * An async function that can be called directly to get the schedule.
 */
export async function getSchedule(input: z.infer<typeof GetScheduleSchema>): Promise<WeeklySchedule | null> {
    return getScheduleTool(input);
}