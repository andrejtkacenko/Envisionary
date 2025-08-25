import { config } from 'dotenv';
config();

// Import flows so they are registered with Genkit
import '@/ai/flows/summarize-progress';
import '@/ai/flows/suggest-goals';
import '@/ai/flows/break-down-goal';
import '@/ai/flows/coach-chat';
import '@/ai/flows/recommend-goals';
import '@/ai/flows/generate-schedule';
import '@/ai/flows/break-down-task';
import '@/ai/flows/generate-schedule-template';


// Import tools so they are registered with Genkit and available to models
import '@/ai/tools/goal-tools';
import '@/ai/tools/schedule-tools';
import '@/ai/tools/calendar-tools';
