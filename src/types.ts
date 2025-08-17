
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
};

export const KANBAN_COLUMNS: { id: GoalStatus; title: string }[] = [
  { id: "todo", title: "To Do" },
  { id: "inprogress", title: "In Progress" },
  { id: "done", title: "Done" },
];


// Types for the new Weekly Planner feature
export type ScheduledItem = {
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
