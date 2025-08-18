
import type { Goal } from "@/types";

interface GoalStats {
  totalCount: number;
  todoCount: number;
  inprogressCount: number;
  doneCount: number;
}

/**
 * Calculates statistics for a list of goals.
 * This function only considers top-level goals and does not count sub-goals.
 * @param goals - An array of Goal objects.
 * @returns An object containing counts for total, to-do, in-progress, and done goals.
 */
export function calculateGoalStats(goals: Goal[]): GoalStats {
  const totalCount = goals.length;
  const todoCount = goals.filter(g => g.status === 'todo').length;
  const inprogressCount = goals.filter(g => g.status === 'inprogress').length;
  const doneCount = goals.filter(g => g.status === 'done').length;

  return { totalCount, todoCount, inprogressCount, doneCount };
}
