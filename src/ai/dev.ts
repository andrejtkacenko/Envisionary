
import { config } from 'dotenv';
config();

import '@/ai/flows/summarize-progress.ts';
import '@/ai/flows/suggest-goals.ts';
import '@/ai/flows/break-down-goal.ts';
import '@/ai/flows/coach-chat.ts';
import '@/ai/flows/recommend-goals.ts';
import '@/ai/flows/generate-schedule.ts';
import '@/ai/tools/goal-tools.ts';
import '@/ai/tools/schedule-tools.ts';

    