import prisma from "@/lib/prisma";
import type { Goal, GoalTemplate, Notification, Task, ScheduleTemplate } from "@/types";

// --- GOAL-RELATED FUNCTIONS ---

export const getGoals = async (userId: string): Promise<Goal[]> => {
    return await prisma.goal.findMany({
        where: { userId },
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
    return await prisma.goal.create({
        data: goalData,
    });
};

export const addGoals = async (goalsData: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<Goal[]> => {
    const createdGoals = await prisma.$transaction(
        goalsData.map(g => prisma.goal.create({ data: g }))
    );
    return createdGoals;
};


export const updateGoal = async (goal: Goal): Promise<Goal> => {
    const { id, ...data } = goal;
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
    return await prisma.task.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' }
    });
};

export const getSubTasks = async (taskId: string): Promise<Task[]> => {
    return await prisma.task.findMany({
        where: { parentId: taskId },
        orderBy: { createdAt: 'asc' }
    });
}

export const addTask = async (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> => {
    return await prisma.task.create({
        data: taskData,
    });
};

export const updateTask = async (task: Task): Promise<Task> => {
    const { id, ...data } = task;
    return await prisma.task.update({
        where: { id },
        data,
    });
};

export const updateTasks = async (tasks: Task[]): Promise<void> => {
    const updates = tasks.map(task => {
        const { id, ...data } = task;
        return prisma.task.update({ where: { id }, data });
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
    return templates.map(t => ({ ...t, subGoals: t.subGoals as any }));
};

export const addGoalTemplate = async (templateData: Omit<GoalTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<GoalTemplate> => {
    const template = await prisma.goalTemplate.create({
        data: {
            ...templateData,
            subGoals: templateData.subGoals as any,
        },
    });
    return { ...template, subGoals: template.subGoals as any };
};

// --- SCHEDULE TEMPLATE FUNCTIONS ---

export const getScheduleTemplates = async (userId: string): Promise<ScheduleTemplate[]> => {
    const templates = await prisma.scheduleTemplate.findMany({
        where: { authorId: userId },
        orderBy: { createdAt: 'desc' },
    });
    return templates.map(t => ({ ...t, schedule: t.schedule as any }));
};

export const addScheduleTemplate = async (templateData: Omit<ScheduleTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<ScheduleTemplate> => {
    const template = await prisma.scheduleTemplate.create({
        data: {
            ...templateData,
            schedule: templateData.schedule as any,
        },
    });
    return { ...template, schedule: template.schedule as any };
};

export const deleteScheduleTemplate = async (templateId: string): Promise<void> => {
    await prisma.scheduleTemplate.delete({
        where: { id: templateId },
    });
};


// --- NOTIFICATION FUNCTIONS ---

export const getNotifications = async (userId: string): Promise<Notification[]> => {
    return await prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 20,
    });
};

export const addNotification = async (notificationData: Omit<Notification, 'id' | 'isRead' | 'createdAt' | 'updatedAt'>): Promise<void> => {
    await prisma.notification.create({
        data: {
            ...notificationData,
        },
    });
};

export const markAllNotificationsAsRead = async (userId: string): Promise<void> => {
    await prisma.notification.updateMany({
        where: { userId, isRead: false },
        data: { isRead: true },
    });
};
