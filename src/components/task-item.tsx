
"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Flag, Calendar, ListTree } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { Task, TaskPriority } from '@/types';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { TaskDialog } from './task-dialog';
import { Progress } from './ui/progress';

const priorityMap: Record<TaskPriority, { color: string; icon: React.ReactNode }> = {
    p1: { color: "bg-red-500", icon: <Flag className="text-red-500" /> },
    p2: { color: "bg-orange-400", icon: <Flag className="text-orange-400" /> },
    p3: { color: "bg-blue-500", icon: <Flag className="text-blue-500" /> },
    p4: { color: "bg-gray-400", icon: <Flag className="text-muted-foreground" /> },
};


interface TaskItemProps {
    task: Task;
    onUpdate: (task: Task) => void;
    onDelete: (taskId: string) => void;
    variant?: 'list' | 'planner';
}

export const TaskItem = ({ task, onUpdate, onDelete, variant = 'list' }: TaskItemProps) => {
    
    const completedSubTasks = task.subTasks?.filter(st => st.isCompleted).length || 0;
    const totalSubTasks = task.subTasks?.length || 0;

    const content = (
        <div className={cn("h-full w-full p-2 rounded-lg flex flex-col justify-center", priorityMap[task.priority].color)}>
            <p className={cn("font-semibold text-white", task.isCompleted && "line-through opacity-70")}>
                {task.title}
            </p>
            {task.description && (
                <p className={cn("text-xs text-white/80", task.isCompleted && "line-through opacity-70")}>
                    {task.description}
                </p>
            )}
            {totalSubTasks > 0 && (
                <div className="text-xs text-white/80 mt-1">
                    {completedSubTasks}/{totalSubTasks} subtasks
                </div>
            )}
        </div>
    );

    if (variant === 'list') {
         return (
            <TaskDialog task={task} onSave={onUpdate} onDelete={onDelete}>
                <motion.div
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className="group flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50"
                >
                    {/* List item rendering logic here */}
                </motion.div>
            </TaskDialog>
        );
    }
    
    return (
        <TaskDialog task={task} onSave={onUpdate} onDelete={onDelete}>
             <motion.div
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
                className={cn(
                    "group w-full h-full cursor-pointer transition-shadow hover:shadow-lg",
                    task.isCompleted && "opacity-60"
                )}
            >
                {content}
            </motion.div>
        </TaskDialog>
    );

};
