import type { Goal as PrismaGoal, Task as PrismaTask, Notification as PrismaNotification, GoalTemplate as PrismaGoalTemplate, ScheduleTemplate as PrismaScheduleTemplate, User as PrismaUser } from '@prisma/client';

export type GoalStatus = "todo" | "inprogress" | "done" | "ongoing";

export type GoalPriority = "low" | "medium" | "high";
export type TaskPriority = "p1" | "p2" | "p3" | "p4";

// This represents a user in our system.
export type AppUser = PrismaUser;

export type Goal = PrismaGoal;
export type Task = Omit<PrismaTask, 'dueDate'> & {
    dueDate?: Date | string;
};


export type NotificationType = "important" | "reminder" | "info";

export type Notification = PrismaNotification;


export const KANBAN_COLUMNS: { id: GoalStatus; title: string }[] = [
  { id: "todo", title: "To Do" },
  { id: "inprogress", title: "In Progress" },
  { id: "done", title: "Done" },
];

// Types for Goal Library
export type GoalTemplateSubGoal = { title: string; description: string; estimatedTime: string; };

export type GoalTemplate = Omit<PrismaGoalTemplate, 'subGoals'> & {
    subGoals: GoalTemplateSubGoal[];
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

export type ScheduleTemplate = Omit<PrismaScheduleTemplate, 'schedule'> & {
    schedule: DailySchedule[];
};
