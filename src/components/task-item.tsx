
"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Flag, ListTree, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Task, TaskPriority } from '@/types';
import { TaskDialog } from './task-dialog';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const priorityMap: Record<TaskPriority, { color: string, className: string }> = {
    p1: { color: "bg-red-500", className: "border-l-red-500" },
    p2: { color: "bg-orange-400", className: "border-l-orange-400" },
    p3: { color: "bg-blue-500", className: "border-l-blue-500" },
    p4: { color: "bg-gray-400", className: "border-l-gray-400" },
};


interface TaskItemProps {
    task: Task;
    onUpdate?: (task: Task) => void;
    onDelete?: (taskId: string) => void;
    variant?: 'list' | 'planner';
    isOverlay?: boolean;
}

export const TaskItem = ({ task, onUpdate, onDelete, variant = 'list', isOverlay = false }: TaskItemProps) => {
    
    const [isDialogOpen, setIsDialogOpen] = React.useState(false);
    
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
      } = useSortable({
        id: task.id,
        data: {
          type: 'Task',
          task,
        },
        disabled: isDialogOpen,
    });

    const style = {
        transition,
        transform: CSS.Transform.toString(transform),
    };


    const completedSubTasks = task.subTasks?.filter(st => st.isCompleted).length || 0;
    const totalSubTasks = task.subTasks?.length || 0;

    const plannerContent = (
         <div className={cn("h-full w-full p-2 rounded-lg flex flex-col justify-center text-white", priorityMap[task.priority].color)}>
            <p className={cn("font-semibold text-sm", task.isCompleted && "line-through opacity-70")}>
                {task.title}
            </p>
            {task.description && (
                <p className={cn("text-xs text-white/80", task.isCompleted && "line-through opacity-70")}>
                    {task.description}
                </p>
            )}
            <div className="flex items-center gap-4 mt-1 text-xs text-white/80">
              {totalSubTasks > 0 && (
                  <div className="flex items-center gap-1">
                     <ListTree className="h-3 w-3" /> {completedSubTasks}/{totalSubTasks}
                  </div>
              )}
               {task.duration && (
                  <div className="flex items-center gap-1">
                     <Clock className="h-3 w-3" /> {task.duration}m
                  </div>
              )}
            </div>
        </div>
    );
    
    const listContent = (
        <div className="w-full">
            <p className={cn("font-medium text-sm", task.isCompleted && "line-through text-muted-foreground")}>{task.title}</p>
        </div>
    )

    const content = (
         <div 
            className={cn(
                "group w-full h-full cursor-pointer transition-shadow hover:shadow-lg",
                isDragging && "opacity-50",
                isOverlay && "shadow-xl scale-105",
                task.isCompleted && "opacity-60"
            )}
        >
            {variant === 'list' ? listContent : plannerContent}
        </div>
    );

    if (isOverlay) return content;

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
            {onUpdate && onDelete ? (
                <TaskDialog task={task} onSave={onUpdate} onDelete={onDelete}>
                   {content}
                </TaskDialog>
            ) : (
                content
            )}
        </div>
    );

};
