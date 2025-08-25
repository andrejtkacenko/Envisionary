
'use server';

/**
 * @fileOverview Defines server actions for interacting with calendar tools.
 */
import { z } from 'genkit';
import { syncWithGoogleCalendar as syncTool } from './calendar-tools';

const SyncSchema = z.object({
  userId: z.string().describe("The ID of the user to sync for."),
});

export async function syncWithGoogleCalendar(input: z.infer<typeof SyncSchema>): Promise<{ message: string }> {
  return syncTool(input);
}
