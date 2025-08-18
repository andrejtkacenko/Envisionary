
'use server';

/**
 * @fileOverview Creates a Google Calendar event.
 *
 * - createCalendarEventFlow - A function that creates a calendar event.
 * - CreateCalendarEventInput - The input type for the createCalendarEvent function.
 * - CreateCalendarEventOutput - The return type for the createCalendarEvent function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { createCalendarEvent } from '@/lib/google-calendar';

const CreateCalendarEventInputSchema = z.object({
    title: z.string().describe('The title of the calendar event.'),
    description: z.string().optional().describe('The description of the event.'),
    startDateTime: z.string().describe('The start time of the event in ISO 8601 format.'),
    endDateTime: z.string().describe('The end time of the event in ISO 8601 format.'),
});
export type CreateCalendarEventInput = z.infer<typeof CreateCalendarEventInputSchema>;

const CreateCalendarEventOutputSchema = z.object({
  eventId: z.string().describe('The ID of the created event.'),
  eventUrl: z.string().describe('The URL to view the created event.'),
});
export type CreateCalendarEventOutput = z.infer<typeof CreateCalendarEventOutputSchema>;

export async function createCalendarEventFlow(input: CreateCalendarEventInput): Promise<CreateCalendarEventOutput> {
  
  const event = {
    summary: input.title,
    description: input.description,
    start: {
      dateTime: input.startDateTime,
      timeZone: 'UTC', // Or dynamically determine user's timezone
    },
    end: {
      dateTime: input.endDateTime,
      timeZone: 'UTC',
    },
  };

  try {
    const createdEvent = await createCalendarEvent(event);
    if (!createdEvent?.id || !createdEvent?.htmlLink) {
        throw new Error('Failed to get event details back from Google Calendar API.');
    }
    return {
      eventId: createdEvent.id,
      eventUrl: createdEvent.htmlLink,
    };
  } catch (error) {
    console.error("Error in createCalendarEventFlow:", error);
    throw new Error('Failed to create Google Calendar event.');
  }
}

ai.defineFlow(
  {
    name: 'createCalendarEventFlow',
    inputSchema: CreateCalendarEventInputSchema,
    outputSchema: CreateCalendarEventOutputSchema,
  },
  createCalendarEventFlow
);
