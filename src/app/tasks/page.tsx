
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Loader2, Plus, Calendar as CalendarIcon, ChevronLeft, ChevronRight, ListTodo, CheckCircle, Circle } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, addMonths, subMonths, isSameDay, isToday, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { getTasks, addTask, updateTask, deleteTask } from '@/lib/goals-service';
import type { Task } from '@/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { TaskDialog } from '@/components/task-dialog';
import { TaskItem } from '@/components/task-item';

export default function TasksPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [tasks, setTasks] = useState<Task[]>([]);
    
    // Calendar state
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());

    useEffect(() => {
        if (user) {
            setIsLoading(true);
            const unsubscribe = getTasks(user.uid, (userTasks) => {
                setTasks(userTasks);
                setIsLoading(false);
            }, (error) => {
                console.error(error);
                toast({ variant: 'destructive', title: 'Error loading tasks' });
                setIsLoading(false);
            });
            return () => unsubscribe();
        }
    }, [user, toast]);
    
    const handleAddTask = async (taskData: Omit<Task, 'id' | 'createdAt'>) => {
        if (!user) return;
        try {
            await addTask(user.uid, taskData);
            toast({ title: "Task Created" });
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: "Failed to create task" });
        }
    };

    const handleUpdateTask = async (task: Task) => {
        if (!user) return;
        try {
            await updateTask(user.uid, task);
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: "Failed to update task" });
        }
    };
    
    const handleDeleteTask = async (taskId: string) => {
        if (!user) return;
        try {
            await deleteTask(user.uid, taskId);
            toast({ title: "Task Deleted" });
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: "Failed to delete task" });
        }
    }

    const filteredTasks = useMemo(() => {
        return tasks
            .filter(task => task.dueDate && isSameDay(task.dueDate, selectedDate))
            .sort((a, b) => {
                // Sort by completion status first (incomplete first), then by priority
                if (a.isCompleted !== b.isCompleted) {
                    return a.isCompleted ? 1 : -1;
                }
                return a.priority.localeCompare(b.priority);
            });
    }, [tasks, selectedDate]);

    // Calendar logic
    const firstDayOfMonth = startOfMonth(currentMonth);
    const lastDayOfMonth = endOfMonth(currentMonth);
    const daysInMonth = eachDayOfInterval({
        start: startOfWeek(firstDayOfMonth, { weekStartsOn: 1 }),
        end: endOfWeek(lastDayOfMonth, { weekStartsOn: 1 }),
    });
    const goToNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const goToPreviousMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

    const tasksByDate = useMemo(() => {
        const map = new Map<string, number>();
        tasks.forEach(task => {
            if (task.dueDate) {
                const dateKey = format(task.dueDate, 'yyyy-MM-dd');
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
                        <ListTodo /> Tasks
                    </h1>
                    <p className="text-muted-foreground">
                        Manage your daily tasks and to-do lists.
                    </p>
                </div>
                <TaskDialog onSave={handleAddTask}>
                    <Button>
                        <Plus className="mr-2 h-4 w-4" /> Add Task
                    </Button>
                </TaskDialog>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
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
                                            hasTasksForDay(day) && !isSameDay(day, selectedDate) && "bg-accent"
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

                 {/* Right Column: Schedule View */}
                <div className="lg:col-span-2">
                    <Card className="h-full">
                        <CardHeader>
                             <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                <div>
                                    <CardTitle>Tasks for {format(selectedDate, "eeee, MMMM do")}</CardTitle>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {isLoading && (
                                <div className="flex flex-col items-center justify-center h-96 gap-2 text-muted-foreground">
                                    <Loader2 className="h-8 w-8 animate-spin" />
                                    <p>Loading your tasks...</p>
                                </div>
                            )}
                            {!isLoading && (
                                <ScrollArea className="h-[calc(100vh-22rem)]">
                                    <div className="space-y-2">
                                        {filteredTasks.length === 0 && (
                                            <div className="flex flex-col items-center justify-center h-96 gap-2 text-muted-foreground">
                                                <CheckCircle className="h-12 w-12" />
                                                <p>No tasks for this day.</p>
                                                <p className="text-xs">Add a task or enjoy your day off!</p>
                                            </div>
                                        )}
                                        {filteredTasks.map(task => (
                                            <TaskItem 
                                                key={task.id} 
                                                task={task} 
                                                onUpdate={handleUpdateTask}
                                                onDelete={handleDeleteTask}
                                            />
                                        ))}
                                    </div>
                                </ScrollArea>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
