
"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { getTasks, addTask, updateTask, deleteTask } from '@/lib/goals-service';
import type { Task } from '@/types';

export const useTasks = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [tasks, setTasks] = useState<Task[]>([]);

    useEffect(() => {
        if (user) {
            setIsLoading(true);
            const unsubscribe = getTasks(user.uid, (userTasks) => {
                const formattedTasks = userTasks.map(task => {
                    let dueDate;
                    if (task.dueDate) {
                        // Handle both Firestore Timestamps and date strings
                        if (typeof task.dueDate === 'string') {
                            dueDate = new Date(task.dueDate);
                        } else if (task.dueDate && typeof (task.dueDate as any).toDate === 'function') {
                            // Firestore Timestamp
                            dueDate = (task.dueDate as any).toDate();
                        } else {
                            dueDate = task.dueDate;
                        }
                    }
                    return {
                        ...task,
                        dueDate,
                    };
                });
                setTasks(formattedTasks as Task[]);
                setIsLoading(false);
            }, (error) => {
                console.error(error);
                toast({ variant: 'destructive', title: 'Error loading tasks' });
                setIsLoading(false);
            });
            return () => unsubscribe();
        } else {
            setIsLoading(false);
            setTasks([]);
        }
    }, [user, toast]);

    const handleAddTask = useCallback(async (taskData: Omit<Task, 'id' | 'createdAt'>) => {
        if (!user) return;
        try {
            await addTask(user.uid, taskData);
            toast({ title: "Task Created" });
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: "Failed to create task" });
        }
    }, [user, toast]);

    const handleUpdateTask = useCallback(async (task: Task) => {
        if (!user) return;
        
        // Optimistic update
        setTasks(currentTasks => currentTasks.map(t => t.id === task.id ? task : t));

        try {
            await updateTask(user.uid, task);
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: "Failed to update task" });
            // Revert on error if needed
        }
    }, [user, toast]);

    const handleDeleteTask = useCallback(async (taskId: string) => {
        if (!user) return;
        
        // Optimistic update
        setTasks(currentTasks => currentTasks.filter(t => t.id !== taskId));
        
        try {
            await deleteTask(user.uid, taskId);
            toast({ title: "Task Deleted" });
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: "Failed to delete task" });
            // Revert on error if needed
        }
    }, [user, toast]);

    const tasksForDay = useMemo(() => tasks, [tasks]);

    return {
        tasks,
        tasksForDay,
        isLoading,
        handleAddTask,
        handleUpdateTask,
        handleDeleteTask,
    };
};
