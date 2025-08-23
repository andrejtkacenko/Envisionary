
import { config } from 'dotenv';
config();

// Import flows so they are registered with Genkit
import '@/ai/flows/summarize-progress.ts';
import '@/ai/flows/suggest-goals.ts';
import '@/ai/flows/break-down-goal.ts';
import '@/ai/flows/coach-chat.ts';
import '@/ai/flows/recommend-goals.ts';
import '@/ai/flows/generate-schedule.ts';

// Import tools so they are registered with Genkit and available to models
import '@/ai/tools/goal-tools.ts';
import '@/ai/tools/schedule-tools.ts';

    
