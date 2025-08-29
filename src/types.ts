

import type { Timestamp } from "firebase/firestore";

export type GoalStatus = "todo" | "inprogress" | "done" | "ongoing";

export type GoalPriority = "low" | "medium" | "high";
export type TaskPriority = "p1" | "p2" | "p3" | "p4";


// This represents a user in our system.
export type AppUser = {
  uid: string;
  email: string | null;
  displayName: string | null;
  telegramId?: number;
};

export type Goal = {
  id: string;
  userId: string;
  parentId?: string; // ID of the parent goal if this is a sub-goal
  title: string;
  description?: string;
  status: GoalStatus;
  priority: GoalPriority;
  category: string;
  dueDate?: Date;
  estimatedTime?: string;
  createdAt: any; // Allow Date or Timestamp
};

export type Task = {
    id: string;
    userId: string;
    parentId?: string; // ID of the parent task if this is a sub-task
    title: string;
    description?: string;
    priority: TaskPriority;
    dueDate?: Date | string; // Allow string for serialization
    isCompleted: boolean;
    createdAt: any;
    time?: string | null; // e.g., "09:00"
    duration?: number; // in minutes
};


export type NotificationType = "important" | "reminder" | "info";

export type Notification = {
    id: string;
    userId: string;
    title: string;
    description: string;
    type: NotificationType;
    isRead: boolean;
    createdAt: Timestamp;
    link?: string; // Optional link to navigate to
};


export const KANBAN_COLUMNS: { id: GoalStatus; title: string }[] = [
  { id: "todo", title: "To Do" },
  { id: "inprogress", title: "In Progress" },
  { id: "done", title: "Done" },
];

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

// Types for Schedule Generator
export type ScheduledItem = {
    taskId?: string;
    title: string;
    startTime: string; // e.g., "09:00"
    endTime: string;   // e.g., "10:30"
    duration: number; // in minutes
};

export type DailySchedule = {
    date: string; // YYYY-MM-DD
    items: ScheduledItem[];
};

export type ScheduleTemplate = {
    id: string;
    name: string;
    authorId: string;
    schedule: DailySchedule[];
    createdAt: Timestamp;
};
