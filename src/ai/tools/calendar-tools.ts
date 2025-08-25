
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

    // In a real implementation, you would:
    // 1. Get an authenticated Google Calendar client for the user.
    // 2. Fetch events from Google Calendar for a relevant time period.
    // 3. Fetch tasks from this app's Firestore database.
    // 4. Compare the two lists of events/tasks.
    // 5. Create new tasks in Firestore for new Google Calendar events.
    // 6. Create new events in Google Calendar for new tasks.
    // 7. Update existing items that have changed on either side.
    // This is a complex process requiring careful state management.

    try {
        // Placeholder logic:
        const now = new Date();
        const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

        const localTasks = await getTasksSnapshot(userId);
        const googleEvents = await getGoogleCalendarEvents(userId, now.toISOString(), oneWeekFromNow.toISOString());

        // This is where the core sync logic would go.
        // For now, we'll just log what we have.
        console.log(`Found ${localTasks.length} local tasks.`);
        console.log(`Found ${googleEvents.length} Google Calendar events.`);
        
        // Example of creating one task in Google Calendar
        if (localTasks.length > 0 && googleEvents.length === 0) { // Avoid duplicates for now
             console.log("Attempting to create a task in Google Calendar...");
            // For this to work, the user needs to have granted calendar permissions.
            // We are calling the service function which contains the placeholder API call.
            await createTaskInGoogleCalendar(userId, localTasks[0]);
        }
        
        // This is a placeholder response.
        return { message: "Sync with Google Calendar initiated. Check server logs for details. Full implementation requires OAuth setup." };

    } catch (error: any) {
        console.error("Error during Google Calendar sync:", error);
        throw new Error("Failed to sync with Google Calendar. Ensure you have granted permissions via the UI.");
    }
  }
);
