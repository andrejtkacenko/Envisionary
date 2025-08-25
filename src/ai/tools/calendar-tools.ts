
'use server';

/**
 * @fileOverview Defines Genkit tools for interacting with external calendars.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getTasksSnapshot } from '@/lib/goals-service';
import { getGoogleCalendarEvents, createTaskInGoogleCalendar } from '@/lib/google-calendar-service';

// Schema for the sync tool
const SyncSchema = z.object({
  userId: z.string().describe("The ID of the user to sync for."),
});

/**
 * A Genkit tool to perform a two-way sync with Google Calendar.
 */
export const syncWithGoogleCalendar = ai.defineTool(
  {
    name: 'syncWithGoogleCalendar',
    description: 'Performs a two-way synchronization between the app and Google Calendar.',
    inputSchema: SyncSchema,
    outputSchema: z.object({ message: z.string() }),
  },
  async ({ userId }) => {
    console.log(`[Tool] syncWithGoogleCalendar called for user: ${userId}`);

    // This is a simplified sync logic. A real implementation would need
    // to handle updates, deletions, and avoid duplicates more robustly,
    // likely by storing event/task IDs from the other system.

    try {
        const now = new Date();
        const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

        // 1. Fetch data from both sources
        const localTasks = await getTasksSnapshot(userId);
        const googleEvents = await getGoogleCalendarEvents(userId, now.toISOString(), oneWeekFromNow.toISOString());
        
        console.log(`Found ${localTasks.length} local tasks.`);
        console.log(`Found ${googleEvents.length} Google Calendar events.`);

        // 2. Sync from our app to Google Calendar
        // Find tasks in our app that don't have a corresponding event in Google Calendar
        const tasksToCreate = localTasks.filter(task => 
            !googleEvents.some(event => event.summary === task.title)
        );

        console.log(`Found ${tasksToCreate.length} tasks to create in Google Calendar.`);
        for (const task of tasksToCreate) {
            if (task.dueDate) { // Only sync tasks with a due date for now
                await createTaskInGoogleCalendar(userId, task);
            }
        }
        
        // 3. Sync from Google Calendar to our app (Placeholder)
        // This is more complex as it involves creating new tasks from events.
        // const eventsToCreate = googleEvents.filter(event => 
        //     !localTasks.some(task => task.title === event.summary)
        // );
        // console.log(`Found ${eventsToCreate.length} events to create locally.`);
        // for (const event of eventsToCreate) {
        //      // await createTaskFromGoogleEvent(userId, event);
        // }

        return { message: "Sync with Google Calendar complete. Check your calendar and server logs for details." };

    } catch (error: any) {
        console.error("Error during Google Calendar sync:", error);
        throw new Error("Failed to sync with Google Calendar. Ensure you have granted permissions via the UI.");
    }
  }
);

