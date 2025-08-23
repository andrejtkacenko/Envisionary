'use server';

/**
 * @fileOverview Defines server actions for interacting with user goals.
 * These actions are safe to call from client components.
 */

import { z } from 'genkit';
import { addGoal as addGoalToDb, getGoalsSnapshot, updateGoal as updateGoalInDb } from '@/lib/goals-service';
import type { Goal, GoalStatus } from '@/types';
import { createGoalTool, updateGoalTool, findGoalsTool } from './goal-tools';

// Schema for creating a new goal
const CreateGoalSchema = z.object({
  userId: z.string().describe("The ID of the user for whom to create the goal."),
  title: z.string().describe("The title of the goal."),
  description: z.string().optional().describe("A detailed description of the goal."),
  category: z.string().optional().describe("The category for this goal (e.g., Work, Health)."),
  priority: z.enum(["low", "medium", "high"]).optional().describe("The priority of the goal."),
  status: z.custom<GoalStatus>().optional().describe("The status of the goal."),
});

// Schema for updating an existing goal
const UpdateGoalSchema = z.object({
    userId: z.string().describe("The ID of the user whose goal is being updated."),
    goalId: z.string().describe("The ID of the goal to update."),
    title: z.string().optional().describe("The new title for the goal."),
    description: z.string().optional().describe("The new description for the goal."),
    category: z.string().optional().describe("The new category for the goal."),
    priority: z.enum(["low", "medium", "high"]).optional().describe("The new priority."),
    status: z.custom<GoalStatus>().optional().describe("The new status."),
});

// Schema for finding goals
const FindGoalsSchema = z.object({
    userId: z.string().describe("The ID of the user whose goals are being searched."),
    query: z.string().describe("A search query to find relevant goals based on their title or description."),
});

/**
 * An async function that can be called directly from server components to create a goal.
 */
export async function createGoal(input: z.infer<typeof CreateGoalSchema>): Promise<Goal> {
    return createGoalTool(input);
}


/**
 * An async function that can be called directly to update a goal.
 */
export async function updateGoal(input: z.infer<typeof UpdateGoalSchema>): Promise<{ success: boolean }> {
    return updateGoalTool(input);
}


/**
 * An async function that can be called directly to find goals.
 */
export async function findGoals(input: z.infer<typeof FindGoalsSchema>): Promise<Goal[]> {
    return findGoalsTool(input);
}
