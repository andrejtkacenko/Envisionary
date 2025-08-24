

"use client";

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { format, setHours, getHours } from 'date-fns';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Plus, GripVertical, Navigation, Sun, Moon } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Task, TaskPriority } from '@/types';
import { cn } from '@/lib/utils';
import { TaskDialog } from './task-dialog';
import { Button } from './ui/button';

// --- Time Constants ---
const HOUR_HEIGHT = 60; // height of one hour in pixels
const TOTAL_HOURS = 24;

// --- Draggable Task Item ---
const DraggableTask = ({ task }: { task: Task }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: task.id,
        data: { type: 'task', task },
    });

    const style = {
        transform: transform ? CSS.Transform.toString(transform) : undefined,
        transition,
    };

    return (
        <div ref={setNodeRef} style={style} className={cn("relative", isDragging && 'opacity-50', 'z-10')}>
            <TaskCard task={task} attributes={attributes} listeners={listeners} />
        </div>
    );
};

// --- Task Card UI ---
const TaskCard = ({ task, attributes, listeners }: { task: Task; attributes: any; listeners: any }) => {
    const priorityColors: Record<TaskPriority, string> = {
        p1: 'bg-red-500',
        p2: 'bg-orange-500',
        p3: 'bg-blue-500',
        p4: 'bg-gray-400',
    };

    return (
        <Card className="mb-2 bg-card/80 backdrop-blur-sm relative group border-l-4" style={{ borderColor: priorityColors[task.priority].replace('bg-', 'var(--color-') }}>
             <TaskDialog task={task} onSave={() => {}} onDelete={() => {}}>
                <div className="p-3 pl-2 flex items-center cursor-pointer">
                    <div className="flex-grow">
                        <p className="font-semibold text-sm">{task.title}</p>
                        {task.description && <p className="text-xs text-muted-foreground">{task.description}</p>}
                    </div>
                    <button {...attributes} {...listeners} className="p-2 opacity-0 group-hover:opacity-100 cursor-grab touch-none">
                        <GripVertical className="h-5 w-5" />
                    </button>
                </div>
            </TaskDialog>
        </Card>
    );
};

// --- Droppable Time Slot ---
const TimeSlot = ({ time, children }: { time: string; children: React.ReactNode }) => {
    const { setNodeRef, isOver } = useDroppable({ id: time, data: { type: 'timeSlot' } });
    return (
        <div ref={setNodeRef} className={cn("relative h-full", isOver && "bg-primary/10")}>
            {children}
        </div>
    );
};

// --- Main Planner Component ---
interface PlannerProps {
    date: Date;
    tasks: Task[];
    unscheduledTasks: Task[];
    isLoading: boolean;
    onTaskCreate: (taskData: Omit<Task, 'id' | 'createdAt'>) => void;
    onTaskUpdate: (task: Task) => void;
    onTaskDelete: (taskId: string) => void;
}

export const Planner = ({ date, tasks, unscheduledTasks, isLoading, onTaskCreate, onTaskUpdate, onTaskDelete }: PlannerProps) => {
    const scheduledTasks = useMemo(() => tasks.filter(t => !!t.time), [tasks]);
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const timelineRef = useRef<HTMLDivElement>(null);
    const [nowIndicatorTop, setNowIndicatorTop] = useState(0);

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

    const scrollToNow = () => {
        const now = new Date();
        const currentHour = getHours(now);
        const currentMinute = now.getMinutes();
        const pixels = (currentHour + currentMinute / 60) * HOUR_HEIGHT;

        if (timelineRef.current) {
            timelineRef.current.scrollTo({
                top: pixels - timelineRef.current.offsetHeight / 2,
                behavior: 'smooth',
            });
        }
    };

    useEffect(() => {
        const updateIndicator = () => {
            const now = new Date();
            const top = (now.getHours() + now.getMinutes() / 60) * HOUR_HEIGHT;
            setNowIndicatorTop(top);
        };

        updateIndicator();
        const interval = setInterval(updateIndicator, 60000); // Update every minute
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        scrollToNow();
    }, [date]);


    return (
        <Card className="h-[calc(100vh-10rem)] flex flex-col">
            <CardHeader className="flex-shrink-0">
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle className="font-headline">Schedule for {format(date, "eeee, MMMM do")}</CardTitle>
                        <CardDescription>A flexible canvas for your day.</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={scrollToNow}>
                        <Navigation className="h-4 w-4 mr-2" /> Go to Now
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col p-0">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
                        <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                ) : (
                    <div className="flex-grow flex h-full">
                        {/* Unscheduled Tasks Column */}
                         <div className="w-1/3 border-r h-full flex flex-col">
                            <h3 className="text-sm font-semibold p-4 border-b">Unscheduled Tasks</h3>
                             <ScrollArea className="flex-grow p-2">
                                <SortableContext items={unscheduledTasks.map(t => t.id)}>
                                    <div id="unscheduled">
                                        {unscheduledTasks.map(task => (
                                            <DraggableTask key={task.id} task={task} />
                                        ))}
                                    </div>
                                </SortableContext>
                                {unscheduledTasks.length === 0 && (
                                    <div className="text-center text-xs text-muted-foreground pt-10">No tasks for today.</div>
                                )}
                            </ScrollArea>
                            <div className="p-2 border-t">
                                <TaskDialog onSave={(data) => onTaskCreate({...data, dueDate: date, isCompleted: false})} >
                                    <Button variant="outline" className="w-full">
                                        <Plus className="mr-2 h-4 w-4"/> Add Task
                                    </Button>
                                </TaskDialog>
                            </div>
                        </div>

                        {/* Timeline Column */}
                        <div className="w-2/3 relative h-full">
                            <ScrollArea className="h-full" ref={timelineRef}>
                                <div className="relative" style={{ height: `${TOTAL_HOURS * HOUR_HEIGHT}px` }}>
                                    {Array.from({ length: TOTAL_HOURS }).map((_, i) => (
                                        <div key={i} className="h-[60px] flex border-b relative">
                                            <div className="w-16 text-right text-xs text-muted-foreground pr-2 pt-[-2px] relative top-[-6px]">
                                                {format(setHours(new Date(), i), 'ha')}
                                            </div>
                                            <TimeSlot time={format(setHours(new Date(), i), 'HH:00')}>
                                                <SortableContext items={tasksByTime.get(format(setHours(new Date(), i), 'HH:00'))?.map(t => t.id) || []}>
                                                    {(tasksByTime.get(format(setHours(new Date(), i), 'HH:00')) || []).map(task => (
                                                        <DraggableTask key={task.id} task={task} />
                                                    ))}
                                                </SortableContext>
                                            </TimeSlot>
                                        </div>
                                    ))}
                                    {isToday(date) && (
                                        <div className="absolute left-16 right-0 h-px bg-red-500 z-20 flex items-center" style={{ top: `${nowIndicatorTop}px` }}>
                                            <div className="h-2 w-2 rounded-full bg-red-500 absolute -left-1"></div>
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
