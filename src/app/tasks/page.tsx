
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { ListTodo, Plus, Inbox, Calendar as CalendarIconLucide, Loader2 } from 'lucide-react';
import { isSameDay, startOfToday, isBefore } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Planner } from '@/components/planner';
import { useTasks } from '@/hooks/use-tasks';
import type { Task } from '@/types';
import { TaskDialog } from '@/components/task-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';


export default function TasksPage() {
    const { tasks, isLoading, handleAddTask, handleUpdateTask, handleDeleteTask } = useTasks();
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
    
    const unscheduledTasks = useMemo(() => tasks.filter(t => !t.dueDate), [tasks]);
    const scheduledTasks = useMemo(() => tasks.filter(t => t.dueDate), [tasks]);
    
    const tasksForSelectedDay = useMemo(() => {
        if (!selectedDate) return [];
        return scheduledTasks.filter(t => t.dueDate && isSameDay(new Date(t.dueDate), selectedDate))
    }, [scheduledTasks, selectedDate]);

    const daysWithTasks = useMemo(() => {
      const dates = new Set<string>();
      tasks.forEach(task => {
        if (task.dueDate) {
          dates.add(format(new Date(task.dueDate), 'yyyy-MM-dd'));
        }
      });
      return Array.from(dates).map(dateStr => new Date(dateStr));
    }, [tasks]);

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 h-screen flex flex-col">
            <div className="flex-shrink-0 flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
                        <ListTodo /> My Tasks
                    </h1>
                    <p className="text-muted-foreground">
                        Plan and visualize your day.
                    </p>
                </div>
                 <div className="flex items-center gap-2">
                    <TaskDialog onSave={handleAddTask}>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" /> New Task
                        </Button>
                    </TaskDialog>
                </div>
            </div>

             <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-grow overflow-hidden">
                {/* Left Column: Calendar & Inbox */}
                <div className="md:col-span-1 h-full flex flex-col gap-6">
                    <Card>
                        <CardContent className="p-0">
                             <Calendar
                                mode="single"
                                selected={selectedDate}
                                onSelect={setSelectedDate}
                                className="p-0"
                                modifiers={{ 
                                    hasTasks: daysWithTasks,
                                    disabled: (date) => isBefore(date, startOfToday()) 
                                }}
                                modifiersClassNames={{ 
                                    hasTasks: 'has-tasks',
                                }}
                            />
                        </CardContent>
                    </Card>
                    <Card className="flex-grow flex flex-col overflow-hidden">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Inbox/> Inbox</CardTitle>
                             <CardDescription>Unscheduled tasks</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-grow overflow-y-auto p-2">
                            {isLoading ? (
                                <div className="flex items-center justify-center h-full">
                                    <Loader2 className="h-6 w-6 animate-spin"/>
                                </div>
                            ) : unscheduledTasks.length > 0 ? (
                                unscheduledTasks.map(task => (
                                    <TaskDialog key={task.id} task={task} onSave={handleUpdateTask} onDelete={handleDeleteTask}>
                                        <button className="w-full text-left">
                                            <Card className="mb-2 hover:bg-muted">
                                                <CardContent className="p-3">
                                                    <p className="font-medium text-sm">{task.title}</p>
                                                </CardContent>
                                            </Card>
                                        </button>
                                    </TaskDialog>
                                ))
                            ) : (
                                <div className="text-center text-sm text-muted-foreground py-16">No unscheduled tasks.</div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Planner */}
                 <div className="md:col-span-2 h-full">
                     <Planner
                        date={selectedDate}
                        tasks={tasksForSelectedDay}
                        isLoading={isLoading}
                        onTaskUpdate={handleUpdateTask}
                        onTaskDelete={handleDeleteTask}
                    />
                 </div>

             </div>
        </div>
    );
}
