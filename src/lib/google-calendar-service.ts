
'use server';

/**
 * @fileOverview Service functions for interacting with the Google Calendar API.
 * NOTE: This implementation requires a mechanism to store and retrieve user-specific
 * OAuth2 tokens. The getCalendarClient function currently uses a placeholder.
 */

import { google } from 'googleapis';
import type { Task } from '@/types';

// This would be your OAuth2 client. It's configured with credentials from your .env file.
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  // This should be an absolute URL to your API route that handles the callback
  `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`
);

/**
 * A placeholder function to represent getting an authenticated API client.
 * In a real application, this would involve retrieving stored tokens for the user.
 * @param userId - The ID of the user.
 * @returns An authenticated Google Calendar API client instance.
 */
const getCalendarClient = async (userId: string) => {
  // TODO: This is the critical part that needs to be implemented.
  // You must fetch the user's stored OAuth tokens (access_token, refresh_token)
  // from your database (e.g., Firestore) and set them on the oauth2Client.
  //
  // Example:
  // const tokens = await getUserTokensFromDb(userId);
  // if (!tokens) {
  //   throw new Error("User has not authenticated with Google Calendar.");
  // }
  // oauth2Client.setCredentials(tokens);
  
  console.warn(`[Google Calendar Service] TODO: Implement proper token retrieval for user ${userId}. API calls will fail without it.`);
  
  return google.calendar({ version: 'v3', auth: oauth2Client });
};


/**
 * Fetches events from the user's primary Google Calendar for a given date range.
 * @param userId - The ID of the user.
 * @param timeMin - The start of the date range (ISO string).
 * @param timeMax - The end of the date range (ISO string).
 * @returns A list of calendar events.
 */
export const getGoogleCalendarEvents = async (userId: string, timeMin: string, timeMax:string) => {
    try {
        const calendar = await getCalendarClient(userId);
        
        // This API call will fail if the oauth2Client does not have credentials.
        const response = await calendar.events.list({
            calendarId: 'primary',
            timeMin,
            timeMax,
            singleEvents: true,
            orderBy: 'startTime',
        });
        return response.data.items || [];
    } catch (error) {
        console.error('Error fetching Google Calendar events. This is expected if tokens are not configured.', error);
        // Return empty array to allow the sync tool to continue without crashing.
        return [];
    }
};


/**
 * Creates a new event in the user's primary Google Calendar from a task.
 * @param userId - The ID of the user.
 * @param task - The task to be added to the calendar.
 */
export const createTaskInGoogleCalendar = async (userId: string, task: Task) => {
    try {
        const calendar = await getCalendarClient(userId);

        const event = {
            summary: task.title,
            description: task.description || 'Task from Envisionary App',
            start: {
                // If the task has a time, create a timed event. Otherwise, create an all-day event.
                dateTime: task.time ? new Date(`${(task.dueDate as Date).toISOString().split('T')[0]}T${task.time}:00`).toISOString() : undefined,
                date: !task.time ? (task.dueDate as Date).toISOString().split('T')[0] : undefined,
                timeZone: 'America/Los_Angeles', // This should ideally be user-configurable
            },
            end: {
               // If it's an all-day event, the end date is the next day.
               // If timed, we assume a 1-hour duration for simplicity.
               dateTime: task.time ? new Date(new Date(`${(task.dueDate as Date).toISOString().split('T')[0]}T${task.time}:00`).getTime() + 60 * 60 * 1000).toISOString() : undefined,
               date: !task.time ? new Date((task.dueDate as Date).getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0] : undefined,
               timeZone: 'America/Los_Angeles',
            },
        };
        
        await calendar.events.insert({
            calendarId: 'primary',
            requestBody: event,
        });

        console.log(`[Google Calendar Service] Successfully created event for task: "${task.title}"`);

    } catch (error) {
         console.error(`Error creating Google Calendar event for task "${task.title}". This is expected if tokens are not configured.`, error);
    }
};

/**
 * Generates a URL that the user will be sent to to consent to calendar access.
 */
export async function getGoogleAuthUrl() {
    const scopes = [
        'https://www.googleapis.com/auth/calendar.events',
        'https://www.googleapis.com/auth/calendar.readonly'
    ];

    return oauth2Client.generateAuthUrl({
        access_type: 'offline', // Important to get a refresh token
        scope: scopes,
        prompt: 'consent', // Force consent screen to get refresh token every time
    });
};

/**
 * Exchanges an authorization code for access and refresh tokens.
 * @param code The authorization code from the Google redirect.
 * @returns The OAuth2 tokens.
 */
export async function exchangeCodeForTokens(code: string) {
    const { tokens } = await oauth2Client.getToken(code);
    return tokens;
};
