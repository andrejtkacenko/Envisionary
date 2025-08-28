
"use client";

import React from 'react';
import { format, isToday, isFuture, isPast } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Task } from '@/types';
import { TaskItem } from './task-item';
import { Separator } from './ui/separator';

interface PlannerProps {
    date: Date | undefined;
    tasks: Task[];
    isLoading: boolean;
    onTaskUpdate: (task: Task) => void;
    onTaskDelete: (taskId: string) => void;
}

export const Planner = ({ date, tasks, isLoading, onTaskUpdate, onTaskDelete }: PlannerProps) => {
    
    const getHeaderText = () => {
        if (!date) return "Tasks";
        if (isToday(date)) return "Today";
        if (isFuture(date)) return `Upcoming on ${format(date, "MMMM do")}`;
        if (isPast(date)) return `Tasks for ${format(date, "MMMM do")}`;
        return format(date, "eeee, MMMM do");
    };

    return (
        <Card className="h-full flex flex-col">
            <CardHeader>
                <CardTitle className="font-headline">{getHeaderText()}</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow overflow-hidden p-2">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
                        <Loader2 className="h-8 w-8 animate-spin" />
                        <p>Loading tasks...</p>
                    </div>
                ) : (
                    <ScrollArea className="h-full">
                        <div className="space-y-2 p-2">
                            {tasks.length > 0 ? (
                                tasks
                                    .sort((a,b) => a.isCompleted === b.isCompleted ? 0 : a.isCompleted ? 1 : -1)
                                    .map(task => (
                                        <TaskItem 
                                            key={task.id} 
                                            task={task} 
                                            onUpdate={onTaskUpdate} 
                                            onDelete={onTaskDelete} 
                                        />
                                ))
                            ) : (
                                <div className="text-center text-muted-foreground py-24">
                                    <p className="font-semibold">No tasks for this day.</p>
                                    <p className="text-sm">Enjoy your break or select another day.</p>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                )}
            </CardContent>
        </Card>
    );
};
