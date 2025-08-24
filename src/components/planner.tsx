
"use client";

import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Plus, GripVertical } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Task, TaskPriority } from '@/types';
import { cn } from '@/lib/utils';


// --- Time Slot Data ---
const timeSlots = Array.from({ length: 15 }, (_, i) => {
    const hour = i + 8;
    return `${String(hour).padStart(2, '0')}:00`;
});

// --- Draggable Task Item ---
const DraggableTask = ({ task, isOverlay }: { task: Task, isOverlay?: boolean }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: task.id,
        data: { type: 'task', task },
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div ref={setNodeRef} style={style} className={cn("relative", isDragging && 'opacity-50', isOverlay && 'z-50')}>
            <TaskCard task={task} attributes={attributes} listeners={listeners} />
        </div>
    );
};


// --- Task Card UI ---
const TaskCard = ({ task, attributes, listeners }: { task: Task, attributes: any, listeners: any }) => {
    const priorityColors: Record<TaskPriority, string> = {
        p1: 'bg-red-500',
        p2: 'bg-orange-500',
        p3: 'bg-blue-500',
        p4: 'bg-gray-400',
    };

    return (
        <Card className="mb-2 bg-card/80 backdrop-blur-sm relative group">
            <div className={cn("absolute left-0 top-0 bottom-0 w-1.5 rounded-l-lg", priorityColors[task.priority])} />
            <CardContent className="p-3 pl-4 flex items-center">
                <div className="flex-grow">
                    <p className="font-semibold text-sm">{task.title}</p>
                    {task.description && <p className="text-xs text-muted-foreground">{task.description}</p>}
                </div>
                 <button {...attributes} {...listeners} className="p-2 opacity-50 group-hover:opacity-100 cursor-grab touch-none">
                     <GripVertical className="h-5 w-5" />
                 </button>
            </CardContent>
        </Card>
    );
};

// --- Droppable Time Slot ---
const TimeSlot = ({ time, children }: { time: string; children: React.ReactNode }) => {
    const { setNodeRef, isOver } = useDroppable({ id: time, data: { type: 'timeSlot' } });
    return (
        <div className="flex gap-4">
            <div className="w-16 text-right text-sm text-muted-foreground pt-3">{time}</div>
            <div ref={setNodeRef} className={cn("flex-grow border-l border-dashed pl-4 py-2 min-h-16", isOver && "bg-primary/10")}>
                {children}
            </div>
        </div>
    );
};

// --- Main Planner Component ---
interface PlannerProps {
    date: Date;
    tasks: Task[];
    isLoading: boolean;
    onTaskCreate: (taskData: Omit<Task, 'id' | 'createdAt'>) => void;
    onTaskUpdate: (task: Task) => void;
    onTaskDelete: (taskId: string) => void;
}

export const Planner = ({ date, tasks, isLoading, onTaskCreate, onTaskUpdate, onTaskDelete }: PlannerProps) => {
    const scheduledTasks = useMemo(() => tasks.filter(t => !!t.time), [tasks]);

    const tasksByTime = useMemo(() => {
        const map = new Map<string, Task[]>();
        scheduledTasks.forEach(task => {
            if (task.time) {
                const list = map.get(task.time) || [];
                list.push(task);
                map.set(task.time, list);
            }
        });
        return map;
    }, [scheduledTasks]);


    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle className="font-headline">Schedule for {format(date, "eeee, MMMM do")}</CardTitle>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-[calc(100vh-22rem)] gap-2 text-muted-foreground">
                        <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                ) : (
                    <ScrollArea className="h-[calc(100vh-15rem)] pr-4">
                        {timeSlots.map(time => (
                            <TimeSlot key={time} time={time}>
                                <SortableContext items={tasksByTime.get(time)?.map(t => t.id) || []} strategy={verticalListSortingStrategy}>
                                {(tasksByTime.get(time) || []).map(task => (
                                    <DraggableTask key={task.id} task={task} />
                                ))}
                                </SortableContext>
                            </TimeSlot>
                        ))}
                    </ScrollArea>
                )}
            </CardContent>
        </Card>
    );
};
