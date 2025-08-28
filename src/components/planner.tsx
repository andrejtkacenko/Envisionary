
"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { format, isToday, startOfDay, addHours, getHours, getMinutes } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Calendar } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Task } from '@/types';
import { TaskItem } from './task-item';
import { Separator } from './ui/separator';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface PlannerProps {
    date: Date | undefined;
    tasks: Task[];
    isLoading: boolean;
    onTaskUpdate: (task: Task) => void;
    onTaskDelete: (taskId: string) => void;
}

const hours = Array.from({ length: 24 }, (_, i) => i);

const TimeIndicator = () => {
    const [top, setTop] = useState(0);
    const [isVisible, setIsVisible] = useState(false);
    
    useEffect(() => {
        const updatePosition = () => {
            const now = new Date();
            const startOfHour = startOfDay(now);
            const totalMinutes = (now.getTime() - startOfHour.getTime()) / (1000 * 60);
            
            // Assuming each hour slot is 64px high
            const newTop = (totalMinutes / 60) * 64; 
            setTop(newTop);
        };
        
        updatePosition();
        const interval = setInterval(updatePosition, 60000); // Update every minute

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
      // Logic to check if the indicator should be visible based on selected date
      // This part depends on how the selected date is passed to this component or its parent
    }, []);

    return (
        <div 
            className="absolute left-12 right-0 h-0.5 bg-red-500 z-10 flex items-center"
            style={{ top: `${top}px` }}
        >
            <div className="h-2 w-2 rounded-full bg-red-500 -ml-1"></div>
        </div>
    );
};


export const Planner = ({ date, tasks, isLoading, onTaskUpdate, onTaskDelete }: PlannerProps) => {
    const scrollRef = useRef<HTMLDivElement>(null);

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
        // Scroll to 8 AM on load
        if(scrollRef.current) {
            scrollRef.current.scrollTop = 8 * 64; // 8 AM * 64px/hour
        }
    }, [date]);


    const getTaskPosition = (task: Task) => {
        if (!task.time) return { top: 0, height: 0 };
        const [hour, minute] = task.time.split(':').map(Number);
        const top = (hour + minute / 60) * 64; // 64px per hour
        // For now, assume a default duration, e.g., 1 hour
        const height = 60; // in minutes
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
            <CardContent className="flex-grow overflow-hidden p-2 relative">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
                        <Loader2 className="h-8 w-8 animate-spin" />
                        <p>Loading tasks...</p>
                    </div>
                ) : (
                    <div className="h-full relative">
                        {allDayTasks.length > 0 && (
                            <div className="p-2 border-b">
                                <div className="grid grid-cols-8 gap-2">
                                     <div className="text-xs text-right pr-2 text-muted-foreground pt-1">all-day</div>
                                     <div className="col-span-7">
                                        {allDayTasks.map(task => (
                                             <TaskItem key={task.id} task={task} onUpdate={onTaskUpdate} onDelete={onDelete} variant="planner"/>
                                        ))}
                                     </div>
                                </div>
                            </div>
                        )}
                        <ScrollArea className="h-full" ref={scrollRef}>
                             <div className="relative">
                                {date && isToday(date) && <TimeIndicator />}
                                {hours.map(hour => (
                                    <div key={hour} className="flex h-16 border-b">
                                        <div className="w-12 text-xs text-right pr-2 text-muted-foreground pt-1">
                                            {format(addHours(startOfDay(new Date()), hour), 'ha')}
                                        </div>
                                        <div className="flex-grow border-l"></div>
                                    </div>
                                ))}

                                {timedTasks.map(task => {
                                    const { top, height } = getTaskPosition(task);
                                    return (
                                        <div key={task.id} className="absolute left-14 right-0" style={{ top: top, height: height }}>
                                            <TaskItem task={task} onUpdate={onTaskUpdate} onDelete={onDelete} variant="planner" />
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
