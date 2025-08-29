
"use client";

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Flag, ListTree, Clock, Bed } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Task, TaskPriority } from '@/types';
import { TaskDialog } from './task-dialog';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { getSubTasks } from '@/lib/goals-service';

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
    style?: React.CSSProperties;
}

export const TaskItem = ({ task, onUpdate, onDelete, variant = 'list', isOverlay = false, style: propStyle }: TaskItemProps) => {
    
    const [isDialogOpen, setIsDialogOpen] = React.useState(false);
    const [subTasks, setSubTasks] = useState<Task[]>([]);
    const isSleepTask = task.title.toLowerCase().includes('sleep');

    useEffect(() => {
        if(task.id) {
            getSubTasks(task.id).then(setSubTasks);
        }
    }, [task.id]);
    
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
        ...propStyle,
        transition,
        transform: CSS.Transform.toString(transform),
    };


    const completedSubTasks = subTasks.filter(st => st.isCompleted).length || 0;
    const totalSubTasks = subTasks.length || 0;

    const plannerContent = (
         <div className={cn(
             "h-full w-full p-2 rounded-lg flex flex-col justify-center text-white", 
             isSleepTask ? "bg-indigo-500" : priorityMap[task.priority].color
         )}>
            <p className={cn("font-semibold text-sm", task.isCompleted && "line-through opacity-70")}>
                {task.title}
            </p>
            {task.description && !isSleepTask && (
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
                     {isSleepTask ? <Bed className="h-3 w-3" /> : <Clock className="h-3 w-3" />} 
                     {Math.floor(task.duration / 60)}h {task.duration % 60 > 0 ? `${task.duration % 60}m` : ''}
                  </div>
              )}
            </div>
        </div>
    );
    
    const listContent = (
        <div className="w-full p-2 rounded-md hover:bg-muted">
            <p className={cn("font-medium text-sm", task.isCompleted && "line-through text-muted-foreground")}>{task.title}</p>
        </div>
    )

    const content = (
         <div 
            className={cn(
                "group w-full h-full cursor-pointer transition-shadow",
                isDragging && "opacity-50",
                isOverlay && "shadow-xl scale-105",
                task.isCompleted && "opacity-60"
            )}
        >
            {variant === 'list' ? listContent : plannerContent}
        </div>
    );

    const FinalTaskItem = (
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

    if (isOverlay) {
        // We calculate style for the overlay separately, as we don't have access to the --hour-height var easily here
        const DUMMY_HOUR_HEIGHT = 80;
        let height;
        if (isSleepTask) {
            height = DUMMY_HOUR_HEIGHT; // 1 hour visually
        } else {
            height = (task.duration || 60) / 60 * DUMMY_HOUR_HEIGHT;
        }
        return <div style={{ height }}>{content}</div>
    }

    return FinalTaskItem;

};
