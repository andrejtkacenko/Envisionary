
import type { Timestamp } from "firebase/firestore";

export type GoalStatus = "todo" | "inprogress" | "done";

export type GoalPriority = "low" | "medium" | "high";

export type Goal = {
  id: string;
  title: string;
  description?: string;
  status: GoalStatus;
  priority: GoalPriority;
  project: string;
  dueDate?: Date;
  subGoals?: Goal[];
  estimatedTime?: string;
};

export const KANBAN_COLUMNS: { id: GoalStatus; title: string }[] = [
  { id: "todo", title: "To Do" },
  { id: "inprogress", title: "In Progress" },
  { id: "done", title: "Done" },
];


// Types for the new Weekly Planner feature
export type ScheduledItem = {
  id: string;
  time: string;
  task: string;
  priority?: GoalPriority;
};

export type DailySchedule = {
  day: string;
  schedule: ScheduledItem[];
};

export type WeeklySchedule = {
  id: string;
  scheduleData: DailySchedule[];
  createdAt?: Timestamp;
};

export type DailyGoalTask = {
    id: string;
    title: string;
    estimatedTime?: string;
}

export type DailyGoal = {
  day: string;
  tasks: DailyGoalTask[];
};

export type GenerateScheduleInput = {
  dailyGoals: DailyGoal[];
  timeConstraints?: string;
  priorities?: string;
};

export type GenerateScheduleOutput = {
  weeklySchedule: DailySchedule[];
};

// Types for Goal Library
export type GoalTemplate = {
    id: string;
    title: string;
    description?: string;
    project: string;
    subGoals: { title: string; description: string; estimatedTime: string; }[];
    authorId: string;
    authorName: string;
    likes: number;
    createdAt: Timestamp;
};
