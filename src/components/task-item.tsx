
"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Flag, Calendar, Trash2, Edit } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { Task, TaskPriority } from '@/types';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { TaskDialog } from './task-dialog';
import { Badge } from './ui/badge';

const priorityMap: Record<TaskPriority, { color: string; icon: React.ReactNode }> = {
    p1: { color: "text-red-500", icon: <Flag /> },
    p2: { color: "text-orange-500", icon: <Flag /> },
    p3: { color: "text-blue-500", icon: <Flag /> },
    p4: { color: "text-muted-foreground", icon: <Flag /> },
};


interface TaskItemProps {
    task: Task;
    onUpdate: (task: Task) => void;
    onDelete: (taskId: string) => void;
}

export const TaskItem = ({ task, onUpdate, onDelete }: TaskItemProps) => {

    const handleToggleComplete = () => {
        onUpdate({ ...task, isCompleted: !task.isCompleted });
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="group flex items-start gap-3 p-3 rounded-lg border border-transparent hover:bg-muted/50"
        >
            <div className="flex items-center pt-1">
                <Checkbox
                    checked={task.isCompleted}
                    onCheckedChange={handleToggleComplete}
                    className={cn(
                        "transition-colors duration-200",
                        !task.isCompleted && priorityMap[task.priority].color.replace('text-', 'border-'),
                        task.isCompleted && 'border-muted-foreground'
                    )}
                />
            </div>
            <div className="flex-grow">
                <p className={cn("text-sm font-medium", task.isCompleted && "line-through text-muted-foreground")}>
                    {task.title}
                </p>
                {task.description && (
                     <p className={cn("text-xs text-muted-foreground", task.isCompleted && "line-through")}>
                        {task.description}
                    </p>
                )}
                <div className="flex items-center gap-4 mt-1">
                    {task.dueDate && (
                        <div className={cn("flex items-center gap-1.5 text-xs", task.isCompleted ? "text-muted-foreground" : "text-blue-600")}>
                            <Calendar className="h-3 w-3" />
                            <span>{format(task.dueDate, "MMM d")}</span>
                        </div>
                    )}
                    {task.project && (
                        <Badge variant="secondary">{task.project}</Badge>
                    )}
                </div>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <TaskDialog task={task} onSave={onUpdate} onDelete={onDelete}>
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                        <Edit className="h-4 w-4" />
                    </Button>
                </TaskDialog>
                <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                    <div className={cn(priorityMap[task.priority].color, "h-4 w-4")}>
                        {priorityMap[task.priority].icon}
                    </div>
                </Button>
            </div>
        </motion.div>
    );
};
