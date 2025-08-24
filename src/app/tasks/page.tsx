
"use client";

import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, ListTodo } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, addMonths, subMonths, isSameDay, isToday } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Planner, DraggableTask } from '@/components/planner';
import { useTasks } from '@/hooks/use-tasks';
import { DndContext, DragEndEvent, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { Task, Goal, DailySchedule } from '@/types';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext } from '@dnd-kit/sortable';
import { TaskDialog } from '@/components/task-dialog';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { getGoals, saveSchedule } from '@/lib/goals-service';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TaskActions } from '@/components/task-actions';

const UnscheduledTasks = ({ tasks, onAddTask, onUpdateTask, onDeleteTask }: { tasks: Task[], onAddTask: (data: any) => void, onUpdateTask: (data: any) => void, onDeleteTask: (id: string) => void }) => {
    const { setNodeRef, isOver } = useDroppable({
        id: 'unscheduled-drop-area',
        data: { type: 'unscheduledArea' }
    });

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Inbox</CardTitle>
                    <p className="text-sm text-muted-foreground">Unscheduled tasks</p>
                </div>
                 <TaskDialog onSave={onAddTask}>
                    <Button variant="ghost" size="icon">
                        <ListTodo className="h-5 w-5" />
                    </Button>
                </TaskDialog>
            </CardHeader>
            <CardContent>
                <ScrollArea ref={setNodeRef} className={cn("h-96 rounded-md p-1", isOver && "bg-primary/10")}>
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
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [activeTask, setActiveTask] = useState<Task | null>(null);
    const [allGoals, setAllGoals] = useState<Goal[]>([]);

    const firstDayOfMonth = startOfMonth(currentMonth);
    const lastDayOfMonth = endOfMonth(currentMonth);
    const daysInMonth = eachDayOfInterval({
        start: startOfWeek(firstDayOfMonth, { weekStartsOn: 1 }),
        end: endOfWeek(lastDayOfMonth, { weekStartsOn: 1 }),
    });
    const goToNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const goToPreviousMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

    React.useEffect(() => {
        if (user) {
            getGoals(user.uid, (goals) => setAllGoals(goals), (err) => console.error(err));
        }
    }, [user]);

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
    
    const tasksForSelectedDay = useMemo(() => {
        return tasks.filter(t => t.dueDate && isSameDay(new Date(t.dueDate), selectedDate))
    }, [tasks, selectedDate]);
    
    const unscheduledTasks = useMemo(() => tasks.filter(t => !t.dueDate), [tasks]);

    const hasTasksForDay = (day: Date) => {
        const dateKey = format(day, 'yyyy-MM-dd');
        return tasksByDate.has(dateKey);
    };
    
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
        const overIsUnscheduledArea = overId === 'unscheduled-drop-area';


        if (overIsTimeSlot) {
            const newTime = overId;
            handleUpdateTask({ ...task, time: newTime, dueDate: selectedDate });
        } else if (overIsUnscheduledArea) {
             if (task.time || task.dueDate) {
                handleUpdateTask({ ...task, time: undefined, dueDate: undefined });
            }
        }
    };

     const handleScheduleApplied = async (schedule: DailySchedule[]) => {
        if (!user) return;
        try {
            await saveSchedule(user.uid, schedule);
            toast({ title: 'Schedule Saved!', description: 'Your new AI-generated schedule has been saved.' });
        } catch (e) {
            console.error(e);
            toast({ variant: 'destructive', title: 'Failed to save schedule' });
        }
    };

    return (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
                            <ListTodo /> My Tasks
                        </h1>
                        <p className="text-muted-foreground">
                            Plan and visualize your day. Drag tasks to schedule them.
                        </p>
                    </div>
                    <TaskActions allGoals={allGoals} onScheduleApplied={handleScheduleApplied} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
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
                        
                        <UnscheduledTasks tasks={unscheduledTasks} onAddTask={handleAddTask} onUpdateTask={handleUpdateTask} onDeleteTask={handleDeleteTask} />
                        
                    </div>

                    <div className="lg:col-span-3">
                        <Planner
                            date={selectedDate}
                            tasks={tasksForSelectedDay}
                            isLoading={isLoading}
                        />
                    </div>
                </div>
            </div>
             <DragOverlay>
                {activeTask ? <DraggableTask task={activeTask} isOverlay /> : null}
            </DragOverlay>
        </DndContext>
    );
}

    