
"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { getTasks, addTask, updateTask, deleteTask, updateTasks } from '@/lib/goals-service';
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
                setTasks(userTasks);
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

    const handleBulkUpdateTasks = useCallback(async (allTasks: Task[]) => {
        if (!user) return;

        // Optimistic update with the full list of tasks
        setTasks(allTasks);

        try {
            // Find which tasks were actually changed to persist them
            const originalTasks = tasks; // `tasks` here is the state before this update
            const changedTasks = allTasks.filter(updatedTask => {
                const originalTask = originalTasks.find(t => t.id === updatedTask.id);
                // A task is considered changed if it's new or if its data doesn't match the original
                return !originalTask || JSON.stringify(originalTask) !== JSON.stringify(updatedTask);
            });

            if (changedTasks.length > 0) {
                 await updateTasks(user.uid, changedTasks);
            }
        } catch (error) {
             console.error(error);
            toast({ variant: 'destructive', title: "Failed to schedule tasks" });
            // TODO: Revert optimistic update on error
        }
    }, [user, toast, tasks]);

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
        handleBulkUpdateTasks,
    };
};
