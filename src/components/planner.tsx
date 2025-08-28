

"use client";

import React, { useRef, useEffect, useState, useMemo } from 'react';
import { format, setHours, getHours, isToday } from 'date-fns';
import { useDroppable } from '@dnd-kit/core';
import { useSortable, SortableContext } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, GripVertical, Navigation } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Task, TaskPriority } from '@/types';
import { cn } from '@/lib/utils';
import { TaskDialog } from './task-dialog';
import { Button } from './ui/button';


// --- Time Constants ---
const HOUR_HEIGHT = 60; // height of one hour in pixels
const TOTAL_HOURS = 24;

const priorityColors: Record<TaskPriority, string> = {
    p1: 'border-red-500',
    p2: 'border-orange-500',
    p3: 'border-blue-500',
    p4: 'border-gray-400',
};


// --- Task Card UI ---
export const DraggableTask = ({ task, isOverlay }: { task: Task; isOverlay?: boolean; }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: task.id,
        data: { type: 'task', task },
    });

    const style = {
        transform: transform ? CSS.Transform.toString(transform) : undefined,
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes}>
            <Card className={cn("mb-2 bg-card/80 backdrop-blur-sm relative group border-l-4", priorityColors[task.priority], isOverlay && "shadow-lg")}>
                <div className="p-3 pl-2 flex items-center">
                    <div className="flex-grow">
                        <p className="font-semibold text-sm">{task.title}</p>
                        {task.description && <p className="text-xs text-muted-foreground">{task.description}</p>}
                    </div>
                    <div {...listeners} className="p-2 opacity-0 group-hover:opacity-100 cursor-grab touch-none">
                        <GripVertical className="h-5 w-5" />
                    </div>
                </div>
            </Card>
        </div>
    );
};



// --- Droppable Time Slot ---
const TimeSlot = ({ time, children }: { time: string; children: React.ReactNode }) => {
    const { setNodeRef, isOver } = useDroppable({ id: time, data: { type: 'timeSlot' } });
    return (
        <div ref={setNodeRef} className={cn("relative h-full pl-4 border-l", isOver && "bg-primary/10")}>
            <SortableContext items={React.Children.toArray(children).map((child: any) => child.key)}>
                 {children}
            </SortableContext>
        </div>
    );
};

// All Day Tasks Slot
const AllDaySlot = ({ children }: { children: React.ReactNode }) => {
    const { setNodeRef, isOver } = useDroppable({ id: 'all-day', data: { type: 'allDaySlot' } });

    return (
        <div ref={setNodeRef} className={cn("relative p-2 border-b", isOver && "bg-primary/10")}>
            <div className="w-16 text-center text-xs font-semibold text-muted-foreground absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full pr-2">
                All-day
            </div>
             <SortableContext items={React.Children.toArray(children).map((child: any) => child.key)}>
                <div className="min-h-[2rem]">
                    {children}
                </div>
            </SortableContext>
             {React.Children.count(children) === 0 && (
                <div className="text-center text-xs text-muted-foreground py-2">Drop tasks here</div>
            )}
        </div>
    );
};


// --- Main Planner Component ---
interface PlannerProps {
    date: Date;
    tasks: Task[];
    isLoading: boolean;
    onTaskUpdate: (task: Task) => void;
    onTaskDelete: (taskId: string) => void;
}

export const Planner = ({ date, tasks, isLoading, onTaskUpdate, onTaskDelete }: PlannerProps) => {
    const timelineRef = useRef<HTMLDivElement>(null);
    const [nowIndicatorTop, setNowIndicatorTop] = useState(0);

    const { scheduledTasks, allDayTasks } = useMemo(() => {
        const scheduled = tasks.filter(t => t.time); // Tasks with a specific time
        const allDay = tasks.filter(t => !t.time); // Tasks without a specific time
        return { scheduledTasks: scheduled, allDayTasks: allDay };
    }, [tasks]);


    const tasksByTime = useMemo(() => {
        const map = new Map<string, Task[]>();
        scheduledTasks.forEach(task => {
            if (task.time) { // This check is now slightly redundant but safe
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
            const viewport = timelineRef.current.querySelector('[data-radix-scroll-area-viewport]');
            if (viewport) {
                viewport.scrollTo({
                    top: pixels - viewport.clientHeight / 2,
                    behavior: 'smooth',
                });
            }
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
        if (isToday(date)) {
            setTimeout(scrollToNow, 100);
        }
    }, [date]);


    return (
        <Card className="h-full flex flex-col">
            <CardHeader className="flex-shrink-0">
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle className="font-headline">Schedule for {format(date, "eeee, MMMM do")}</CardTitle>
                        <CardDescription>A flexible canvas for your day.</CardDescription>
                    </div>
                     {isToday(date) && (
                        <Button variant="outline" size="sm" onClick={scrollToNow}>
                            <Navigation className="h-4 w-4 mr-2" /> Go to Now
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent className="flex-grow p-0 overflow-hidden">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
                        <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                ) : (
                    <div className="h-full flex flex-col">
                        <div className="pl-16 pr-2">
                            <AllDaySlot>
                                {allDayTasks.map(task => (
                                     <TaskDialog key={task.id} task={task} onSave={onTaskUpdate} onDelete={onTaskDelete}>
                                        <div className="cursor-pointer">
                                           <DraggableTask task={task} />
                                        </div>
                                     </TaskDialog>
                                ))}
                            </AllDaySlot>
                        </div>
                        <ScrollArea className="flex-grow" ref={timelineRef}>
                            <div className="relative pl-16 pr-2" style={{ height: `${TOTAL_HOURS * HOUR_HEIGHT}px` }}>
                                {isToday(date) && (
                                    <div className="absolute left-16 right-0 h-px bg-red-500 z-20 flex items-center" style={{ top: `${nowIndicatorTop}px` }}>
                                        <div className="h-2 w-2 rounded-full bg-red-500 absolute -left-1"></div>
                                    </div>
                                )}
                                {Array.from({ length: TOTAL_HOURS }).map((_, i) => {
                                    const timeKey = format(setHours(new Date(), i), 'HH:00');
                                    const tasksForSlot = tasksByTime.get(timeKey) || [];
                                    return (
                                    <div key={i} className="h-[60px] flex border-b">
                                        <div className="w-16 text-right text-xs text-muted-foreground pr-2 pt-[-2px] relative top-[-6px] -translate-x-16">
                                            {format(setHours(new Date(), i), 'ha')}
                                        </div>
                                        <TimeSlot time={timeKey}>
                                            {tasksForSlot.map(task => (
                                                <TaskDialog key={task.id} task={task} onSave={onTaskUpdate} onDelete={onTaskDelete}>
                                                    <div className="cursor-pointer">
                                                        <DraggableTask task={task} />
                                                    </div>
                                                </TaskDialog>
                                            ))}
                                        </TimeSlot>
                                    </div>
                                )})}
                            </div>
                        </ScrollArea>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
