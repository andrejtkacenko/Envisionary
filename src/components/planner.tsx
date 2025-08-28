
"use client";

import React, { useEffect, useMemo, useRef } from 'react';
import { format, isToday, startOfDay, addHours, setHours, setMinutes } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Task } from '@/types';
import { TaskItem } from './task-item';
import { useDroppable } from '@dnd-kit/core';

interface PlannerProps {
    date: Date | undefined;
    tasks: Task[];
    isLoading: boolean;
    onTaskUpdate: (task: Task) => void;
    onTaskDelete: (taskId: string) => void;
}

const hours = Array.from({ length: 24 }, (_, i) => i);

const TimeIndicator = () => {
    const [top, setTop] = React.useState(0);

    useEffect(() => {
        const updatePosition = () => {
            const now = new Date();
            const totalMinutes = now.getHours() * 60 + now.getMinutes();
            const newTop = (totalMinutes / 60) * 64; 
            setTop(newTop);
        };
        
        updatePosition();
        const interval = setInterval(updatePosition, 60000);

        return () => clearInterval(interval);
    }, []);

    return (
        <div 
            className="absolute left-12 right-0 h-0.5 bg-red-500 z-20 flex items-center"
            style={{ top: `${top}px` }}
        >
            <div className="h-2 w-2 rounded-full bg-red-500 -ml-1"></div>
        </div>
    );
};

const HourSlot = ({ hour, children }: { hour: number; children?: React.ReactNode }) => {
    const { setNodeRef } = useDroppable({
        id: `hour-${hour}`,
        data: {
            type: 'hour-slot',
            hour,
        },
    });

    return (
        <div ref={setNodeRef} className="flex h-16 border-b relative">
            <div className="w-12 text-xs text-right pr-2 text-muted-foreground pt-1">
                {format(addHours(startOfDay(new Date()), hour), 'ha')}
            </div>
            <div className="flex-grow border-l">
                {children}
            </div>
        </div>
    );
};


export const Planner = ({ date, tasks, isLoading, onTaskUpdate, onTaskDelete }: PlannerProps) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const { setNodeRef: setPlannerRef } = useDroppable({ id: 'planner' });

    const getHeaderText = () => {
        if (!date) return "Tasks";
        return format(date, "eeee, MMMM do");
    };

    const getHeaderSubText = () => {
         if (!date) return "";
         if (isToday(date)) return "Today";
         return format(date, 'yyyy');
    }

    const { allDayTasks, timedTasks } = useMemo(() => {
        const allDay = tasks.filter(t => !t.time);
        const timed = tasks.filter(t => !!t.time);
        return { allDayTasks: allDay, timedTasks: timed };
    }, [tasks]);

    useEffect(() => {
        if(scrollRef.current) {
            scrollRef.current.scrollTop = 8 * 64; 
        }
    }, [date]);


    const getTaskPosition = (task: Task) => {
        if (!task.time) return { top: 0, height: 0 };
        const [hour, minute] = task.time.split(':').map(Number);
        const top = (hour + minute / 60) * 64;
        const height = 60; // default 1 hour
        return { top, height: (height / 60) * 64 };
    }

    return (
        <Card className="h-full flex flex-col">
            <CardHeader>
                <div className="flex items-baseline gap-2">
                    <CardTitle className="font-headline text-2xl">{getHeaderText()}</CardTitle>
                    <CardDescription>{getHeaderSubText()}</CardDescription>
                </div>
            </CardHeader>
            <CardContent className="flex-grow overflow-hidden p-2" ref={setPlannerRef}>
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
                        <Loader2 className="h-8 w-8 animate-spin" />
                        <p>Loading tasks...</p>
                    </div>
                ) : (
                    <div className="h-full flex flex-col">
                        {allDayTasks.length > 0 && (
                            <div className="p-2 border-b">
                                <div className="grid grid-cols-[3rem,1fr] gap-2">
                                     <div className="text-xs text-right pr-2 text-muted-foreground pt-1">all-day</div>
                                     <div className="col-span-1 space-y-1">
                                        {allDayTasks.map(task => (
                                             <TaskItem key={task.id} task={task} onUpdate={onTaskUpdate} onDelete={onTaskDelete} variant="planner"/>
                                        ))}
                                     </div>
                                </div>
                            </div>
                        )}
                        <ScrollArea className="flex-grow" ref={scrollRef}>
                             <div className="relative">
                                {date && isToday(date) && <TimeIndicator />}
                                {hours.map(hour => (
                                    <HourSlot key={hour} hour={hour} />
                                ))}

                                {timedTasks.map(task => {
                                    const { top, height } = getTaskPosition(task);
                                    return (
                                        <div key={task.id} className="absolute left-14 right-0 z-10" style={{ top, height }}>
                                            <TaskItem task={task} onUpdate={onTaskUpdate} onDelete={onTaskDelete} variant="planner" />
                                        </div>
                                    )
                                })}
                             </div>
                        </ScrollArea>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
