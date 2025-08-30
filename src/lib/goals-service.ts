

import prisma from "@/lib/prisma";
import type { Goal, GoalTemplate, Notification, Task, ScheduleTemplate } from "@/types";

// --- GOAL-RELATED FUNCTIONS ---

export const getGoals = async (userId: string): Promise<Goal[]> => {
    return await prisma.goal.findMany({
        where: { user: { firebaseUid: userId } },
        orderBy: { createdAt: 'desc' }
    });
};

export const getSubGoals = async (goalId: string): Promise<Goal[]> => {
    return await prisma.goal.findMany({
        where: { parentId: goalId },
        orderBy: { createdAt: 'asc' }
    });
};

export const addGoal = async (goalData: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>): Promise<Goal> => {
    const user = await prisma.user.findUnique({ where: { id: goalData.userId }});
    if (!user) throw new Error("User not found");

    const { userId, ...restOfGoalData } = goalData;

    return await prisma.goal.create({
        data: {
            ...restOfGoalData,
            user: {
                connect: { id: user.id }
            }
        },
    });
};

export const addGoals = async (firebaseUid: string, goalsData: Omit<Goal, 'id' | 'createdAt' | 'updatedAt' | 'userId'>[]): Promise<void> => {
    const user = await prisma.user.findUnique({ where: { firebaseUid }});
    if (!user) throw new Error("User not found");

    const goalsToCreate = goalsData.map(g => ({
        ...g,
        userId: user.id,
    }));

    await prisma.goal.createMany({
        data: goalsToCreate,
    });
};


export const updateGoal = async (goal: Goal): Promise<Goal> => {
    const { id, userId, ...data } = goal;
    return await prisma.goal.update({
        where: { id },
        data,
    });
};

export const deleteGoal = async (goalId: string): Promise<void> => {
    // Prisma's cascading delete will handle sub-goals if the relation is set up correctly.
    await prisma.goal.delete({
        where: { id: goalId },
    });
};


// --- TASK-RELATED FUNCTIONS ---

export const getTasks = async (userId: string): Promise<Task[]> => {
    const tasks = await prisma.task.findMany({
        where: { user: { firebaseUid: userId } },
        orderBy: { createdAt: 'desc' }
    });
    // Prisma returns Date objects, but we need to ensure they are strings for serialization
    return tasks.map(task => ({
        ...task,
        dueDate: task.dueDate ? task.dueDate.toISOString() : undefined,
    }));
};

export const getSubTasks = async (taskId: string): Promise<Task[]> => {
     const tasks = await prisma.task.findMany({
        where: { parentId: taskId },
        orderBy: { createdAt: 'asc' }
    });
     return tasks.map(task => ({
        ...task,
        dueDate: task.dueDate ? task.dueDate.toISOString() : undefined,
    }));
}

export const addTask = async (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> => {
    const user = await prisma.user.findUnique({ where: { id: taskData.userId }});
    if (!user) throw new Error("User not found");
    const { userId, ...restOfTaskData } = taskData;
    
    const newTask = await prisma.task.create({
        data: {
            ...restOfTaskData,
            dueDate: taskData.dueDate ? new Date(taskData.dueDate) : undefined,
            user: {
                connect: { id: user.id }
            }
        },
    });
    return {
        ...newTask,
        dueDate: newTask.dueDate ? newTask.dueDate.toISOString() : undefined,
    };
};

export const updateTask = async (task: Task): Promise<Task> => {
    const { id, userId, ...data } = task;
    const updatedTask = await prisma.task.update({
        where: { id },
        data: {
            ...data,
            dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        },
    });
    return {
        ...updatedTask,
        dueDate: updatedTask.dueDate ? updatedTask.dueDate.toISOString() : undefined,
    };
};

export const updateTasks = async (tasks: Task[]): Promise<void> => {
    const updates = tasks.map(task => {
        const { id, userId, ...data } = task;
        return prisma.task.update({ where: { id }, data: {
            ...data,
            dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        }});
    });
    await prisma.$transaction(updates);
};

export const deleteTask = async (taskId: string): Promise<void> => {
    await prisma.task.delete({
        where: { id: taskId },
    });
};

export const deleteTasks = async (taskIds: string[]): Promise<void> => {
    await prisma.task.deleteMany({
        where: { id: { in: taskIds } },
    });
};


// --- GOAL TEMPLATE FUNCTIONS ---

export const getGoalTemplates = async (): Promise<GoalTemplate[]> => {
    const templates = await prisma.goalTemplate.findMany({
        orderBy: { createdAt: 'desc' },
    });
    return templates.map(t => ({ ...t, subGoals: t.subGoals as any, createdAt: t.createdAt.toISOString() }));
};

export const addGoalTemplate = async (templateData: Omit<GoalTemplate, 'id' | 'createdAt' | 'updatedAt' | 'authorName' | 'authorId'> & { authorId: string }): Promise<GoalTemplate> => {
    const user = await prisma.user.findUnique({ where: { id: templateData.authorId }});
    if (!user) throw new Error("Author not found");

    const template = await prisma.goalTemplate.create({
        data: {
            ...templateData,
            subGoals: templateData.subGoals as any,
            authorName: user.displayName || user.email || "Anonymous",
            author: {
                connect: { id: user.id }
            }
        },
    });
    return { ...template, subGoals: template.subGoals as any, createdAt: template.createdAt.toISOString() };
};

// --- SCHEDULE TEMPLATE FUNCTIONS ---

export const getScheduleTemplates = async (userId: string): Promise<ScheduleTemplate[]> => {
    const templates = await prisma.scheduleTemplate.findMany({
        where: { author: { firebaseUid: userId } },
        orderBy: { createdAt: 'desc' },
    });
    return templates.map(t => ({ ...t, schedule: t.schedule as any, createdAt: t.createdAt.toISOString() }));
};

export const addScheduleTemplate = async (firebaseUid: string, templateData: Omit<ScheduleTemplate, 'id' | 'createdAt' | 'updatedAt' | 'authorId'>): Promise<ScheduleTemplate> => {
    const user = await prisma.user.findUnique({ where: { firebaseUid }});
    if (!user) throw new Error("Author not found");

    const template = await prisma.scheduleTemplate.create({
        data: {
            ...templateData,
            authorId: user.id,
            schedule: templateData.schedule as any,
        },
    });
    return { ...template, schedule: template.schedule as any, createdAt: template.createdAt.toISOString() };
};

export const deleteScheduleTemplate = async (templateId: string): Promise<void> => {
    await prisma.scheduleTemplate.delete({
        where: { id: templateId },
    });
};


// --- NOTIFICATION FUNCTIONS ---

export const getNotifications = async (userId: string): Promise<Notification[]> => {
    const user = await prisma.user.findUnique({ where: { firebaseUid: userId } });
    if (!user) return [];

    return await prisma.notification.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 20,
    });
};

export const addNotification = async (notificationData: Omit<Notification, 'id' | 'isRead' | 'createdAt' | 'updatedAt'>): Promise<void> => {
    const user = await prisma.user.findUnique({ where: { id: notificationData.userId }});
    if (!user) return;

    await prisma.notification.create({
        data: {
            ...notificationData,
            user: {
                connect: { id: user.id }
            }
        },
    });
};

export const markAllNotificationsAsRead = async (firebaseUid: string): Promise<void> => {
    const user = await prisma.user.findUnique({ where: { firebaseUid }});
    if (!user) return;
    await prisma.notification.updateMany({
        where: { userId: user.id, isRead: false },
        data: { isRead: true },
    });
};
