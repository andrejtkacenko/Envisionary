
"use client";

import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, ListTodo } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, addMonths, subMonths, isSameDay, isToday } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Planner } from '@/components/planner';
import { useTasks } from '@/hooks/use-tasks';

export default function TasksPage() {
    const { tasks, isLoading, handleAddTask, handleUpdateTask, handleDeleteTask } = useTasks();
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());

    // Calendar logic
    const firstDayOfMonth = startOfMonth(currentMonth);
    const lastDayOfMonth = endOfMonth(currentMonth);
    const daysInMonth = eachDayOfInterval({
        start: startOfWeek(firstDayOfMonth, { weekStartsOn: 1 }), // Assuming week starts on Monday
        end: endOfWeek(lastDayOfMonth, { weekStartsOn: 1 }),
    });
    const goToNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const goToPreviousMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

    const tasksByDate = useMemo(() => {
        const map = new Map<string, number>();
        tasks.forEach(task => {
            if (task.dueDate) {
                const dateKey = format(new Date(task.dueDate), 'yyyy-MM-dd');
                map.set(dateKey, (map.get(dateKey) || 0) + 1);
            }
        });
        return map;
    }, [tasks]);

    const hasTasksForDay = (day: Date) => {
        const dateKey = format(day, 'yyyy-MM-dd');
        return tasksByDate.has(dateKey);
    };

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
                        <ListTodo /> My Day
                    </h1>
                    <p className="text-muted-foreground">
                        Plan and visualize your day.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Left Column: Calendar */}
                <div className="lg:col-span-1 space-y-8">
                    <Card>
                         <CardHeader>
                            <div className="flex items-center justify-between">
                                <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <h2 className="text-lg sm:text-xl font-semibold font-headline text-center">
                                    {format(currentMonth, 'MMMM yyyy')}
                                </h2>
                                <Button variant="outline" size="icon" onClick={goToNextMonth}>
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                             <div className="grid grid-cols-7 text-center font-semibold text-xs sm:text-sm text-muted-foreground">
                                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => (
                                    <div key={`${day}-${index}`} className="py-2">{day}</div>
                                ))}
                            </div>
                             <div className="grid grid-cols-7 gap-1">
                                {daysInMonth.map((day, index) => (
                                    <button
                                        key={index}
                                        onClick={() => setSelectedDate(day)}
                                        className={cn(
                                            "relative flex h-10 w-10 items-center justify-center rounded-md text-sm transition-colors hover:bg-muted",
                                            format(day, 'M') !== format(currentMonth, 'M') && "text-muted-foreground/50",
                                            isToday(day) && "bg-primary/10 text-primary",
                                            isSameDay(day, selectedDate) && "bg-primary text-primary-foreground",
                                            hasTasksForDay(day) && !isSameDay(day, selectedDate) && "font-bold"
                                        )}
                                    >
                                        <span>{format(day, 'd')}</span>
                                        {hasTasksForDay(day) && <div className="absolute bottom-1.5 h-1.5 w-1.5 rounded-full bg-accent-foreground/50"></div>}
                                    </button>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                 {/* Right Column: Planner View */}
                <div className="lg:col-span-3">
                    <Planner
                        date={selectedDate}
                        tasks={tasks}
                        isLoading={isLoading}
                        onTaskCreate={handleAddTask}
                        onTaskUpdate={handleUpdateTask}
                        onTaskDelete={handleDeleteTask}
                    />
                </div>
            </div>
        </div>
    );
}
