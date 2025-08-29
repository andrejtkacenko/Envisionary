
"use client";

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { ListTodo, Plus, Inbox, Calendar as CalendarIconLucide, Loader2 } from 'lucide-react';
import { isSameDay, startOfDay, isBefore, setHours, setMinutes, format } from 'date-fns';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverEvent,
  DragOverlay,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import isEqual from 'lodash.isequal';

import { useTaskStore } from '@/hooks/use-task-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Planner } from '@/components/planner';
import type { Task } from '@/types';
import { TaskDialog } from '@/components/task-dialog';
import { TaskItem } from '@/components/task-item';
import { TaskActions } from '@/components/task-actions';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';


const UnscheduledTasks = ({ tasks, onUpdate, onDelete }: { tasks: Task[], onUpdate: (task: Task) => void, onDelete: (taskId: string) => void }) => {
    const { setNodeRef, isOver } = useDroppable({
        id: 'inbox',
    });

    const handleUpdate = useCallback((task: Task) => {
        onUpdate(task);
    }, [onUpdate]);

    const handleDelete = useCallback((taskId: string) => {
        onDelete(taskId);
    }, [onDelete]);


    return (
        <Card className="flex-grow flex flex-col overflow-hidden">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Inbox/> Inbox</CardTitle>
                 <CardDescription>Unscheduled tasks</CardDescription>
            </CardHeader>
            <CardContent
              ref={setNodeRef}
              className={cn(
                "flex-grow overflow-y-auto p-2 transition-colors duration-200",
                isOver ? "bg-primary/10" : ""
              )}
            >
                 <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                    {tasks.length > 0 ? (
                        tasks.map(task => (
                            <TaskItem key={task.id} task={task} onUpdate={handleUpdate} onDelete={handleDelete} variant="list"/>
                        ))
                    ) : (
                        <div className="text-center text-sm text-muted-foreground py-16">No unscheduled tasks.</div>
                    )}
                </SortableContext>
            </CardContent>
        </Card>
    )
}


export default function TasksPage() {
    const { appUser } = useAuth();
    const { tasks, isLoading, fetchTasks, addTask, updateTask, deleteTask } = useTaskStore();
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
    const [draggedTask, setDraggedTask] = useState<Task | null>(null);

    // Initial fetch of tasks
    useEffect(() => {
        if (appUser) {
            fetchTasks(appUser.id);
        }
    }, [appUser, fetchTasks]);

    const unscheduledTasks = useMemo(() => tasks.filter(t => !t.dueDate), [tasks]);
    const scheduledTasks = useMemo(() => tasks.filter(t => !!t.dueDate), [tasks]);
    
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

    const sensors = useSensors(
        useSensor(PointerSensor, {
          activationConstraint: {
            distance: 8,
          },
        })
    );
    
    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        const task = tasks.find(t => t.id === active.id);
        if (task) {
            setDraggedTask(task);
        }
    };
    
    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setDraggedTask(null);

        if (!appUser || !over || !active.id) return;
        
        const originalTask = tasks.find(t => t.id === active.id);
        if (!originalTask) return;

        let finalTask = { ...originalTask };

        const overIsInbox = over.id === 'inbox';
        const overIsHourSlot = typeof over.data.current?.hour === 'number';

        if (overIsInbox) {
            finalTask.dueDate = undefined;
            finalTask.time = null;
        } else if (overIsHourSlot && selectedDate) {
            const hour = over.data.current?.hour as number;
            const newDate = setHours(startOfDay(selectedDate), hour);
            const newTime = format(newDate, 'HH:mm');
            finalTask.dueDate = newDate;
            finalTask.time = newTime;
        } else {
            return; // Dropped in a non-droppable area
        }

        if (!isEqual(originalTask, finalTask)) {
            updateTask(finalTask);
        }
    };
    
    const handleUpdateTask = useCallback((task: Task) => {
        if (!appUser) return;
        updateTask(task);
    }, [appUser, updateTask]);

    const handleDeleteTask = useCallback((taskId: string) => {
        if (!appUser) return;
        deleteTask(taskId);
    }, [appUser, deleteTask]);

    const handleAddTask = useCallback((taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
        if (!appUser) return;
        addTask(taskData);
    }, [appUser, addTask]);


    return (
        <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            collisionDetection={closestCenter}
        >
            <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 h-screen flex flex-col">
                <div className="flex-shrink-0 flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
                            <ListTodo /> My Tasks
                        </h1>
                        <p className="text-muted-foreground">
                            Plan and visualize your day, inspired by Apple Calendar.
                        </p>
                    </div>
                     <div className="flex items-center gap-2">
                        <TaskActions allTasks={tasks} />
                    </div>
                </div>

                 <div className="grid grid-cols-1 md:grid-cols-4 gap-6 flex-grow overflow-hidden">
                    {/* Left Column: Inbox & Calendar */}
                    <div className="md:col-span-1 h-full flex flex-col gap-6 overflow-hidden">
                        {isLoading ? (
                            <div className="flex items-center justify-center h-full">
                                <Loader2 className="h-6 w-6 animate-spin"/>
                            </div>
                        ) : (
                           <div className="flex-grow flex flex-col overflow-hidden">
                             <UnscheduledTasks tasks={unscheduledTasks} onUpdate={handleUpdateTask} onDelete={handleDeleteTask} />
                           </div>
                        )}
                        <Card>
                            <CardContent className="p-0">
                                 <Calendar
                                    mode="single"
                                    selected={selectedDate}
                                    onSelect={setSelectedDate}
                                    className="p-0"
                                    modifiers={{ 
                                        hasTasks: daysWithTasks,
                                        disabled: (date) => isBefore(date, startOfDay(new Date())) 
                                    }}
                                    modifiersClassNames={{ 
                                        hasTasks: 'has-tasks',
                                    }}
                                />
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Column: Planner */}
                     <div className="md:col-span-3 h-full">
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
             <DragOverlay>
                {draggedTask ? (
                    <TaskItem 
                        task={draggedTask}
                        isOverlay
                    />
                ) : null}
            </DragOverlay>
        </DndContext>
    );
}
