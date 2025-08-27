
'use server';

/**
 * @fileOverview Service functions for interacting with the Google Calendar API.
 */

import { google } from 'googleapis';
import type { Task } from '@/types';
import { getUserTokens, saveUserTokens } from './google-auth-service';
import type { Credentials } from 'google-auth-library';
import { GoogleAuthError } from './google-auth-error';


// This would be your OAuth2 client. It's configured with credentials from your .env file.
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  // This should be an absolute URL to your API route that handles the callback
  `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`
);

/**
 * Gets an authenticated Google Calendar API client.
 * It retrieves stored tokens, and if they are expired, it uses the refresh token
 * to get new ones and saves them.
 * @param userId - The ID of the user.
 * @returns An authenticated Google Calendar API client instance.
 */
const getCalendarClient = async (userId: string) => {
  const tokens = await getUserTokens(userId);
  if (!tokens) {
    throw new GoogleAuthError("User has not authenticated with Google Calendar.");
  }
  oauth2Client.setCredentials(tokens);

  // Handle token refresh if necessary
  if (tokens.expiry_date && tokens.expiry_date < Date.now()) {
      console.log('Tokens expired, refreshing...');
      const { credentials } = await oauth2Client.refreshAccessToken();
      oauth2Client.setCredentials(credentials);
      await saveUserTokens(userId, credentials);
      console.log('Tokens refreshed and saved.');
  }
  
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
        
        const response = await calendar.events.list({
            calendarId: 'primary',
            timeMin,
            timeMax,
            singleEvents: true,
            orderBy: 'startTime',
        });
        return response.data.items || [];
    } catch (error) {
        console.error('Error fetching Google Calendar events:', error);
        throw error;
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
         console.error(`Error creating Google Calendar event for task "${task.title}".`);
         throw error;
    }
};

/**
 * Generates a URL that the user will be sent to to consent to calendar access.
 * We include the userId in the `state` parameter to identify the user upon callback.
 * @param userId The ID of the user initiating the auth flow.
 */
export async function getGoogleAuthUrl(userId: string) {
    const scopes = [
        'https://www.googleapis.com/auth/calendar.events',
        'https://www.googleapis.com/auth/calendar.readonly'
    ];

    return oauth2Client.generateAuthUrl({
        access_type: 'offline', // Important to get a refresh token
        scope: scopes,
        prompt: 'consent', // Force consent screen to get refresh token every time
        state: userId, // Pass the user ID here
    });
};

/**
 * Exchanges an authorization code for access and refresh tokens.
 * @param code The authorization code from the Google redirect.
 * @returns The OAuth2 tokens.
 */
export async function exchangeCodeForTokens(code: string): Promise<Credentials> {
    const { tokens } = await oauth2Client.getToken(code);
    return tokens;
};
