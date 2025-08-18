
import { auth } from 'google-auth-library';
import { google } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/calendar'];

async function getAuthenticatedClient() {
  const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS || '{}');
  const client = auth.fromJSON(credentials);
  client.scopes = SCOPES;
  return client;
}

export async function createCalendarEvent(event: any) {
  const authClient = await getAuthenticatedClient();
  const calendar = google.calendar({ version: 'v3', auth: authClient as any });

  try {
    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
    });
    return response.data;
  } catch (error) {
    console.error('Error creating calendar event:', error);
    throw error;
  }
}
