
'use server';
/**
 * @fileOverview Defines server actions for interacting with the schedule generation AI flow.
 */

import { generateSchedule as generateScheduleFlow, GenerateScheduleInput, GenerateScheduleOutput } from '@/ai/flows/generate-schedule';

// We re-export the AI flow action to be used on the client.
// This provides a clear separation between the AI logic and the client-callable actions.
export async function generateSchedule(input: GenerateScheduleInput): Promise<GenerateScheduleOutput> {
  return generateScheduleFlow(input);
}
