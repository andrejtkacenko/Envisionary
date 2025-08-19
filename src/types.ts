
import type { Timestamp } from "firebase/firestore";

export type GoalStatus = "todo" | "inprogress" | "done";

export type GoalPriority = "low" | "medium" | "high";

export type Goal = {
  id: string;
  title: string;
  description?: string;
  status: GoalStatus;
  priority: GoalPriority;
  category: string;
  dueDate?: Date;
  subGoals?: Goal[];
  estimatedTime?: string;
  createdAt: any; // Allow Date or Timestamp
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

// Types for Goal Library
export type GoalTemplate = {
    id: string;
    title: string;
    description?: string;
    category: string;
    subGoals: { title: string; description: string; estimatedTime: string; }[];
    authorId: string;
    authorName: string;
    likes: number;
    createdAt: Timestamp;
};

// Types for Schedule Templates
export type ScheduleTemplate = {
    id: string;
    name: string;
    type: 'day' | 'week';
    data: DailySchedule[]; // For week templates, this will have 7 items. For day, just 1.
};

// Represents a daily goal with tasks that have estimated times
export type DailyGoalTask = {
    id: string;
    title: string;
    estimatedTime?: string;
};
