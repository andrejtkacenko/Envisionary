
'use server';

/**
 * @fileOverview Generates an iCalendar (.ics) file from a daily schedule.
 *
 * - generateIcs - A function that creates an .ics file string.
 * - GenerateIcsInput - The input type for the generateIcs function.
 * - GenerateIcsOutput - The return type for the generateIcs function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import * as ics from 'ics';
import { parse, set } from 'date-fns';
import type { DailySchedule } from '@/types';

const ScheduledItemSchema = z.object({
    id: z.string(),
    time: z.string(),
    task: z.string(),
    priority: z.enum(["low", "medium", "high"]).optional(),
});

const DailyScheduleSchema = z.object({
  day: z.string(),
  schedule: z.array(ScheduledItemSchema),
});

const GenerateIcsInputSchema = z.object({
  schedule: DailyScheduleSchema,
  date: z.string().describe("The date for the schedule in ISO format (e.g., YYYY-MM-DDTHH:mm:ss.sssZ)."),
});
type GenerateIcsInput = z.infer<typeof GenerateIcsInputSchema>;


const GenerateIcsOutputSchema = z.object({
    icsString: z.string().describe("The calendar event data as an .ics formatted string."),
});
type GenerateIcsOutput = z.infer<typeof GenerateIcsOutputSchema>;

function parseTime(timeStr: string, referenceDate: Date): { start: Date, end: Date } | null {
    const timeParts = timeStr.split(' - ');
    if (timeParts.length !== 2) return null;

    try {
        const startTime = parse(timeParts[0].trim(), 'hh:mm a', referenceDate);
        const endTime = parse(timeParts[1].trim(), 'hh:mm a', referenceDate);
        
        const startDateTime = set(referenceDate, { 
            hours: startTime.getHours(), 
            minutes: startTime.getMinutes(),
            seconds: 0,
            milliseconds: 0,
        });

        const endDateTime = set(referenceDate, {
             hours: endTime.getHours(), 
             minutes: endTime.getMinutes(),
             seconds: 0,
             milliseconds: 0,
        });

        return { start: startDateTime, end: endDateTime };
    } catch(e) {
        console.error(`Error parsing time string: "${timeStr}"`, e);
        return null;
    }
}

export async function generateIcs(input: GenerateIcsInput): Promise<GenerateIcsOutput> {
  const { schedule, date } = input;
  const referenceDate = new Date(date);

  const events: ics.EventAttributes[] = schedule.schedule.map(item => {
    const timeRange = parseTime(item.time, referenceDate);
    if (!timeRange) return null;

    const { start, end } = timeRange;
    
    const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    const durationMinutes = ((end.getTime() - start.getTime()) % (1000 * 60 * 60)) / (1000 * 60);

    return {
      title: item.task,
      description: `Priority: ${item.priority || 'not set'}`,
      start: [start.getFullYear(), start.getMonth() + 1, start.getDate(), start.getHours(), start.getMinutes()],
      duration: { hours: durationHours, minutes: durationMinutes },
      status: 'CONFIRMED' as ics.EventStatus,
      busyStatus: 'BUSY' as ics.BusyStatus,
    };
  }).filter((event): event is ics.EventAttributes => event !== null);

  const { error, value } = ics.createEvents(events);

  if (error) {
    console.error("Error creating ICS file:", error);
    throw new Error("Could not generate ICS file.");
  }
  
  return { icsString: value || "" };
}

ai.defineFlow(
  {
    name: 'generateIcsFlow',
    inputSchema: GenerateIcsInputSchema,
    outputSchema: GenerateIcsOutputSchema,
  },
  generateIcs
);

