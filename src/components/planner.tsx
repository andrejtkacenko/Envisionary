
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
export const TaskCard = ({ task, isOverlay, attributes, listeners }: { task: Task; isOverlay?: boolean; attributes?: any; listeners?: any }) => {
    return (
        <Card className={cn("mb-2 bg-card/80 backdrop-blur-sm relative group border-l-4", priorityColors[task.priority], isOverlay && "shadow-lg")}>
            <TaskDialog task={task} onSave={() => {}} onDelete={() => {}}>
                <div className="p-3 pl-2 flex items-center cursor-pointer">
                    <div className="flex-grow">
                        <p className="font-semibold text-sm">{task.title}</p>
                        {task.description && <p className="text-xs text-muted-foreground">{task.description}</p>}
                    </div>
                     {listeners && (
                        <button {...attributes} {...listeners} className="p-2 opacity-0 group-hover:opacity-100 cursor-grab touch-none">
                            <GripVertical className="h-5 w-5" />
                        </button>
                    )}
                </div>
            </TaskDialog>
        </Card>
    );
};


// --- Draggable Task Item ---
export const DraggableTask = ({ task }: { task: Task }) => {
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
        <div ref={setNodeRef} style={style}>
            <TaskCard task={task} attributes={attributes} listeners={listeners} />
        </div>
    );
};



// --- Droppable Time Slot ---
const TimeSlot = ({ time, children }: { time: string; children: React.ReactNode }) => {
    const { setNodeRef, isOver } = useDroppable({ id: time, data: { type: 'timeSlot' } });
    return (
        <div ref={setNodeRef} className={cn("relative h-full pl-4", isOver && "bg-primary/10")}>
            <SortableContext items={React.Children.toArray(children).map((child: any) => child.key)}>
                 {children}
            </SortableContext>
        </div>
    );
};

// --- Main Planner Component ---
interface PlannerProps {
    date: Date;
    tasks: Task[];
    isLoading: boolean;
}

export const Planner = ({ date, tasks, isLoading }: PlannerProps) => {
    const scheduledTasks = useMemo(() => tasks.filter(t => !!t.time), [tasks]);
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
        if (isToday(date)) {
            // Give it a moment for the DOM to be ready
            setTimeout(scrollToNow, 100);
        }
    }, [date]);


    return (
        <Card className="h-[calc(100vh-10rem)] flex flex-col">
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
            <CardContent className="flex-grow p-0">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
                        <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                ) : (
                    <ScrollArea className="h-full" ref={timelineRef}>
                        <div className="relative" style={{ height: `${TOTAL_HOURS * HOUR_HEIGHT}px` }}>
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
                                    <div className="w-16 text-right text-xs text-muted-foreground pr-2 pt-[-2px] relative top-[-6px]">
                                        {format(setHours(new Date(), i), 'ha')}
                                    </div>
                                    <TimeSlot time={timeKey}>
                                        {tasksForSlot.map(task => (
                                            <DraggableTask key={task.id} task={task} />
                                        ))}
                                    </TimeSlot>
                                </div>
                            )})}
                        </div>
                    </ScrollArea>
                )}
            </CardContent>
        </Card>
    );
};
