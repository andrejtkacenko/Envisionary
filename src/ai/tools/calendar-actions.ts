
'use server';

/**
 * @fileOverview Defines server actions for interacting with calendar tools.
 */
import { z } from 'genkit';
import { syncWithGoogleCalendar as syncTool } from './calendar-tools';
import { getGoogleAuthUrl } from '@/lib/google-calendar-service';
import { GoogleAuthError } from '@/lib/google-auth-error';

const SyncSchema = z.object({
  userId: z.string().describe("The ID of the user to sync for."),
});

/**
 * A server action that handles the Google Calendar sync process, including the auth flow.
 * This function is safe to call from client components.
 */
export async function syncWithGoogleCalendar(input: z.infer<typeof SyncSchema>): Promise<{ message: string; authUrl?: string; }> {
  try {
    // Attempt to run the sync tool.
    return await syncTool(input);
  } catch (error: any) {
    // If we catch our custom auth error, it means we need to re-authenticate.
    if (error instanceof GoogleAuthError || (error.cause instanceof GoogleAuthError)) {
      console.log("[Auth Action] Authentication required. Generating auth URL.");
      const authUrl = await getGoogleAuthUrl(input.userId);
      // Return the URL to the client so it can redirect the user.
      return { message: "Authentication required.", authUrl: authUrl };
    }
    // Re-throw other errors.
    console.error("Unhandled error during sync process:", error);
    throw new Error("An unexpected error occurred during Google Calendar synchronization.");
  }
}
