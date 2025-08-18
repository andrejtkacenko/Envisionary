
import type { Goal } from "@/types";

interface GoalStats {
  totalCount: number;
  todoCount: number;
  inprogressCount: number;
  doneCount: number;
}

/**
 * Calculates statistics for a list of goals, including their sub-goals.
 * @param goals - An array of Goal objects.
 * @returns An object containing counts for total, to-do, in-progress, and done goals.
 */
export function calculateGoalStats(goals: Goal[]): GoalStats {
  let totalCount = 0;
  let todoCount = 0;
  let inprogressCount = 0;
  let doneCount = 0;

  const countGoalsRecursively = (goalList: Goal[]) => {
    for (const goal of goalList) {
      totalCount++;
      switch (goal.status) {
        case "todo":
          todoCount++;
          break;
        case "inprogress":
          inprogressCount++;
          break;
        case "done":
          doneCount++;
          break;
      }

      if (goal.subGoals && goal.subGoals.length > 0) {
        countGoalsRecursively(goal.subGoals);
      }
    }
  };

  countGoalsRecursively(goals);

  return { totalCount, todoCount, inprogressCount, doneCount };
}
