

"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { ListTodo, Plus, RefreshCw } from 'lucide-react';
import { isSameDay } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Planner } from '@/components/planner';
import { useTasks } from '@/hooks/use-tasks';
import { DndContext, DragEndEvent, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { Task } from '@/types';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext } from '@dnd-kit/sortable';
import { DraggableTask } from '@/components/planner';
import { TaskDialog } from '@/components/task-dialog';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { getGoals } from '@/lib/goals-service';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TaskActions } from '@/components/task-actions';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { getGoogleAuthUrl } from '@/lib/google-calendar-service';


const UnscheduledTasks = ({ tasks }: { tasks: Task[] }) => {
    const { setNodeRef, isOver } = useDroppable({
        id: 'unscheduled-drop-area',
        data: { type: 'unscheduledArea' }
    });

    return (
        <Card className="flex-1 flex flex-col h-full">
            <CardHeader className="flex-shrink-0">
                <CardTitle>Inbox</CardTitle>
                <CardDescription>Unscheduled tasks</CardDescription>
            </CardHeader>
            <CardContent ref={setNodeRef} className={cn("flex-grow p-2 rounded-md h-full", isOver && "bg-primary/10")}>
                <ScrollArea className="h-full">
                    <SortableContext items={tasks.map(t => t.id)}>
                        <div className="space-y-2">
                        {tasks.length > 0 ? (
                            tasks.map(task => (
                                <DraggableTask key={task.id} task={task} />
                            ))
                        ) : (
                            <div className="text-center text-sm text-muted-foreground py-16">No unscheduled tasks.</div>
                        )}
                        </div>
                    </SortableContext>
                </ScrollArea>
            </CardContent>
        </Card>
    );
};


export default function TasksPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const { tasks, isLoading, handleAddTask, handleUpdateTask, handleDeleteTask } = useTasks();
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [activeTask, setActiveTask] = useState<Task | null>(null);
    const [allGoals, setAllGoals] = useState<any[]>([]);
    const [isSyncing, setIsSyncing] = useState(false);

    useEffect(() => {
        if (user) {
            const unsubscribe = getGoals(user.uid, (goals) => setAllGoals(goals), (err) => console.error(err));
            return () => unsubscribe();
        }
    }, [user]);

    const tasksForSelectedDay = useMemo(() => {
        return tasks.filter(t => t.dueDate && isSameDay(new Date(t.dueDate), selectedDate))
    }, [tasks, selectedDate]);
    
    const unscheduledTasks = useMemo(() => tasks.filter(t => !t.dueDate), [tasks]);
    
    const daysWithTasks = useMemo(() => {
      const dates = new Set<string>();
      tasks.forEach(task => {
        if (task.dueDate) {
          dates.add(format(new Date(task.dueDate), 'yyyy-MM-dd'));
        }
      });
      return Array.from(dates).map(dateStr => new Date(dateStr));
    }, [tasks]);
    
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

    const handleDragStart = (event: any) => {
      const { active } = event;
      setActiveTask(active.data.current?.task || null);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        setActiveTask(null);
        const { active, over } = event;

        if (!over || !active.data.current) return;
        
        const task = active.data.current.task as Task;
        const overId = over.id as string;

        const overIsTimeSlot = over.data.current?.type === 'timeSlot';
        const overIsAllDaySlot = overId === 'all-day';
        const overIsUnscheduledArea = overId === 'unscheduled-drop-area';


        if (overIsTimeSlot) {
            const newTime = overId;
            handleUpdateTask({ ...task, time: newTime, dueDate: selectedDate });
        } else if (overIsAllDaySlot) {
            handleUpdateTask({ ...task, time: null, dueDate: selectedDate });
        } else if (overIsUnscheduledArea) {
             if (task.time || task.dueDate) {
                handleUpdateTask({ ...task, time: undefined, dueDate: undefined });
            }
        }
    };

     const handleScheduleApplied = async (schedule: any[]) => {
        if (!user) return;
        // This is a placeholder for a more complex implementation
        toast({ title: 'Schedule Applied!', description: 'AI-generated schedule has been processed.' });
    };

    const handleSync = async () => {
        if (!user) {
            toast({ variant: 'destructive', title: 'Not authenticated' });
            return;
        }
        setIsSyncing(true);
        try {
            // TODO: First, check if the user has already authenticated and has tokens.
            // If not, redirect to auth URL. If yes, call the syncTool.

            const authUrl = await getGoogleAuthUrl();
            window.location.href = authUrl;

        } catch (error: any) {
            console.error(error);
            toast({
                variant: 'destructive',
                title: 'Sync Failed',
                description: error.message || 'Could not initiate sync with Google. Please try again.',
            });
             setIsSyncing(false);
        }
        // Don't set isSyncing to false here, because the page will redirect.
    };


    return (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 h-screen flex flex-col">
                <div className="flex-shrink-0 flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
                            <ListTodo /> My Tasks
                        </h1>
                        <p className="text-muted-foreground">
                            Plan and visualize your day. Drag tasks to schedule them.
                        </p>
                    </div>
                     <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={handleSync} disabled={isSyncing}>
                            <RefreshCw className={cn("mr-2 h-4 w-4", isSyncing && "animate-spin")} />
                            Sync with Google
                        </Button>
                        <TaskActions allGoals={allGoals} onScheduleApplied={handleScheduleApplied} />
                        <TaskDialog onSave={handleAddTask}>
                            <Button>
                                <Plus className="mr-2 h-4 w-4" /> New Task
                            </Button>
                        </TaskDialog>
                    </div>
                </div>

                <div className="flex-grow grid grid-cols-1 md:grid-cols-4 gap-8 items-start overflow-hidden">
                    <div className="md:col-span-1 h-full flex flex-col gap-6">
                        <Card>
                            <CardContent className="p-0">
                                <Calendar
                                    mode="single"
                                    selected={selectedDate}
                                    onSelect={(date) => date && setSelectedDate(date)}
                                    className="p-0"
                                    modifiers={{ hasTasks: daysWithTasks }}
                                    modifiersClassNames={{ hasTasks: 'has-tasks' }}
                                />
                            </CardContent>
                        </Card>
                        
                        <div className="hidden md:flex flex-col flex-1 h-0">
                          <UnscheduledTasks tasks={unscheduledTasks} />
                        </div>
                        
                    </div>

                    <div className="md:col-span-3 h-full">
                        <Planner
                            date={selectedDate}
                            tasks={tasksForSelectedDay}
                            isLoading={isLoading}
                        />
                    </div>
                </div>
            </div>
             <DragOverlay>
                {activeTask ? <DraggableTask isOverlay task={activeTask} /> : null}
            </DragOverlay>
        </DndContext>
    );
}

