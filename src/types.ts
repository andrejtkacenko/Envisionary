
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

export type Task = {
    id: string;
    title: string;
    description?: string;
    priority: TaskPriority;
    project?: string;
    dueDate?: Date;
    isCompleted: boolean;
    createdAt: any;
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


// Types for the new Weekly Planner feature
export type ScheduledItem = {
  id:string;
  time: string; // e.g., "09:00 AM - 10:00 AM"
  task: string;
  priority: GoalPriority;
};

export type DailySchedule = {
  day: string; // e.g., "Monday"
  schedule: ScheduledItem[];
};

export type WeeklySchedule = {
  id: string; // e.g., "current_week"
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

export type ScheduleTemplate = {
  id: string;
  name: string;
  type: 'day' | 'week';
  data: DailySchedule[];
  createdAt: Timestamp;
};
