
'use server';

/**
 * @fileOverview Defines Genkit tools for interacting with user goals in Firestore.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { addGoal as addGoalToDb, getGoals, updateGoal as updateGoalInDb } from '@/lib/goals-service';
import type { Goal } from '@/types';

// Schema for creating a new goal
const CreateGoalSchema = z.object({
  userId: z.string().describe("The ID of the user for whom to create the goal."),
  title: z.string().describe("The title of the goal."),
  description: z.string().optional().describe("A detailed description of the goal."),
  project: z.string().optional().describe("The project category for this goal."),
  priority: z.enum(["low", "medium", "high"]).optional().describe("The priority of the goal."),
});

// Schema for updating an existing goal
const UpdateGoalSchema = z.object({
    userId: z.string().describe("The ID of the user whose goal is being updated."),
    goalId: z.string().describe("The ID of the goal to update."),
    title: z.string().optional().describe("The new title for the goal."),
    description: z.string().optional().describe("The new description for the goal."),
    project: z.string().optional().describe("The new project category."),
    priority: z.enum(["low", "medium", "high"]).optional().describe("The new priority."),
    status: z.enum(["todo", "inprogress", "done"]).optional().describe("The new status."),
});

// Schema for finding goals
const FindGoalsSchema = z.object({
    userId: z.string().describe("The ID of the user whose goals are being searched."),
    query: z.string().describe("A search query to find relevant goals based on their title or description."),
});


/**
 * A Genkit tool that creates a new goal for a user.
 */
export const createGoalTool = ai.defineTool(
    {
        name: 'createGoal',
        description: 'Creates a new goal for the user.',
        inputSchema: CreateGoalSchema,
        outputSchema: z.custom<Goal>(),
    },
    async (input) => {
        console.log(`[Tool] createGoal called with:`, input);
        const { userId, ...goalData } = input;
        const newGoal = await addGoalToDb(userId, {
            ...goalData,
            status: 'todo', // Default status
            priority: goalData.priority || 'medium', // Default priority
            project: goalData.project || 'General', // Default project
        });
        return newGoal;
    }
);

/**
 * An async function that can be called directly from server components to create a goal.
 */
export async function createGoal(input: z.infer<typeof CreateGoalSchema>): Promise<Goal> {
    return createGoalTool(input);
}


/**
 * A Genkit tool that updates an existing goal for a user.
 */
export const updateGoalTool = ai.defineTool(
    {
        name: 'updateGoal',
        description: "Updates an existing user goal. Requires the goal's ID.",
        inputSchema: UpdateGoalSchema,
        outputSchema: z.object({ success: z.boolean() }),
    },
    async (input) => {
        console.log(`[Tool] updateGoal called with:`, input);
        const { userId, goalId, ...updates } = input;
        
        // First, fetch all goals to find the one to update
        const goals = await getGoals(userId);
        const goalToUpdate = goals.find(g => g.id === goalId);

        if (!goalToUpdate) {
            throw new Error(`Goal with ID ${goalId} not found.`);
        }

        const updatedGoal = { ...goalToUpdate, ...updates };

        await updateGoalInDb(userId, updatedGoal);
        return { success: true };
    }
);

/**
 * An async function that can be called directly to update a goal.
 */
export async function updateGoal(input: z.infer<typeof UpdateGoalSchema>): Promise<{ success: boolean }> {
    return updateGoalTool(input);
}

/**
 * A Genkit tool to find user goals based on a query.
 */
export const findGoalsTool = ai.defineTool(
    {
        name: 'findGoals',
        description: 'Finds user goals based on a search query to get their details and IDs.',
        inputSchema: FindGoalsSchema,
        outputSchema: z.array(z.custom<Goal>()),
    },
    async ({ userId, query }) => {
        console.log(`[Tool] findGoals called with query: "${query}" for user: ${userId}`);
        const allGoals = await getGoals(userId);
        const lowerCaseQuery = query.toLowerCase();

        // Simple text search in title and description
        const foundGoals = allGoals.filter(goal => 
            goal.title.toLowerCase().includes(lowerCaseQuery) ||
            goal.description?.toLowerCase().includes(lowerCaseQuery)
        );

        // Return only essential fields to the model to save tokens
        return foundGoals.map(({ id, title, description, project }) => ({ id, title, description, project })) as Goal[];
    }
);

/**
 * An async function that can be called directly to find goals.
 */
export async function findGoals(input: z.infer<typeof FindGoalsSchema>): Promise<Goal[]> {
    return findGoalsTool(input);
}
