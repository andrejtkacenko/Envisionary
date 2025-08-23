'use server';

/**
 * @fileOverview Defines server actions for interacting with user goals and AI flows.
 * These actions are safe to call from client components.
 */

import { z } from 'genkit';
import { createGoalTool, updateGoalTool, findGoalsTool } from './goal-tools';
import type { Goal, GoalStatus } from '@/types';
import { summarizeProgress as summarizeProgressFlow, SummarizeProgressInput, SummarizeProgressOutput } from '@/ai/flows/summarize-progress';
import { recommendGoals as recommendGoalsFlow, RecommendGoalsInput, RecommendGoalsOutput } from '@/ai/flows/recommend-goals';
import { suggestGoals as suggestGoalsFlow, SuggestGoalsInput, SuggestGoalsOutput } from '@/ai/flows/suggest-goals';
import { breakDownGoal as breakDownGoalFlow, BreakDownGoalInput, BreakDownGoalOutput } from '@/ai/flows/break-down-goal';
import { coachChat as coachChatFlow, CoachChatInput, CoachChatOutput } from '@/ai/flows/coach-chat';


// --- Goal CRUD Actions ---

const CreateGoalSchema = z.object({
  userId: z.string().describe("The ID of the user for whom to create the goal."),
  title: z.string().describe("The title of the goal."),
  description: z.string().optional().describe("A detailed description of the goal."),
  category: z.string().optional().describe("The category for this goal (e.g., Work, Health)."),
  priority: z.enum(["low", "medium", "high"]).optional().describe("The priority of the goal."),
  status: z.custom<GoalStatus>().optional().describe("The status of the goal."),
});

const UpdateGoalSchema = z.object({
    userId: z.string().describe("The ID of the user whose goal is being updated."),
    goalId: z.string().describe("The ID of the goal to update."),
    title: z.string().optional().describe("The new title for the goal."),
    description: z.string().optional().describe("The new description for the goal."),
    category: z.string().optional().describe("The new category for the goal."),
    priority: z.enum(["low", "medium", "high"]).optional().describe("The new priority."),
    status: z.custom<GoalStatus>().optional().describe("The new status."),
});

const FindGoalsSchema = z.object({
    userId: z.string().describe("The ID of the user whose goals are being searched."),
    query: z.string().describe("A search query to find relevant goals based on their title or description."),
});


export async function createGoal(input: z.infer<typeof CreateGoalSchema>): Promise<Goal> {
    return createGoalTool(input);
}

export async function updateGoal(input: z.infer<typeof UpdateGoalSchema>): Promise<{ success: boolean }> {
    return updateGoalTool(input);
}

export async function findGoals(input: z.infer<typeof FindGoalsSchema>): Promise<Goal[]> {
    return findGoalsTool(input);
}

// --- AI Flow Server Actions ---

export async function summarizeProgress(input: SummarizeProgressInput): Promise<SummarizeProgressOutput> {
  return summarizeProgressFlow(input);
}

export async function recommendGoals(input: RecommendGoalsInput): Promise<RecommendGoalsOutput> {
    return recommendGoalsFlow(input);
}

export async function suggestGoals(input: SuggestGoalsInput): Promise<SuggestGoalsOutput> {
    return suggestGoalsFlow(input);
}

export async function breakDownGoal(input: BreakDownGoalInput): Promise<BreakDownGoalOutput> {
    return breakDownGoalFlow(input);
}

export async function coachChat(input: CoachChatInput): Promise<CoachChatOutput> {
    return coachChatFlow(input);
}
