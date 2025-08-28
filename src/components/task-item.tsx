
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
    p1: { color: "border-red-500", icon: <Flag className="text-red-500" /> },
    p2: { color: "border-orange-400", icon: <Flag className="text-orange-400" /> },
    p3: { color: "border-blue-500", icon: <Flag className="text-blue-500" /> },
    p4: { color: "border-muted", icon: <Flag className="text-muted-foreground" /> },
};


interface TaskItemProps {
    task: Task;
    onUpdate: (task: Task) => void;
    onDelete: (taskId: string) => void;
}

export const TaskItem = ({ task, onUpdate, onDelete }: TaskItemProps) => {

    const handleToggleComplete = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent dialog from opening
        onUpdate({ ...task, isCompleted: !task.isCompleted });
    };
    
    const completedSubTasks = task.subTasks?.filter(st => st.isCompleted).length || 0;
    const totalSubTasks = task.subTasks?.length || 0;
    const progress = totalSubTasks > 0 ? (completedSubTasks / totalSubTasks) * 100 : (task.isCompleted ? 100 : 0);

    return (
        <TaskDialog task={task} onSave={onUpdate} onDelete={onDelete}>
            <motion.div
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className={cn("group flex items-start gap-3 p-3 rounded-lg border-l-4 cursor-pointer hover:bg-muted/50", priorityMap[task.priority].color)}
            >
                <div className="flex items-center pt-1" onClick={handleToggleComplete}>
                    <Checkbox
                        checked={task.isCompleted}
                        className={cn(
                            "transition-colors duration-200 h-5 w-5 rounded-full",
                             priorityMap[task.priority].color
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
                    <div className="flex items-center gap-4 mt-2">
                        {task.dueDate && (
                            <div className={cn("flex items-center gap-1.5 text-xs", task.isCompleted ? "text-muted-foreground" : "text-primary")}>
                                <Calendar className="h-3 w-3" />
                                <span>{format(new Date(task.dueDate), "MMM d")}</span>
                            </div>
                        )}
                        {totalSubTasks > 0 && (
                            <div className={cn("flex items-center gap-1.5 text-xs", task.isCompleted ? "text-muted-foreground" : "text-gray-600")}>
                                <ListTree className="h-3 w-3" />
                                <span>{completedSubTasks}/{totalSubTasks}</span>
                            </div>
                        )}
                    </div>
                    {totalSubTasks > 0 && (
                        <Progress value={progress} className="h-1 mt-2" />
                    )}
                </div>
            </motion.div>
        </TaskDialog>
    );
};

