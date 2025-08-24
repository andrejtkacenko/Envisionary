
"use client";

import React, { useState, useMemo } from 'react';
import { format, isSameDay } from 'date-fns';
import { DndContext, DragEndEvent, DragOverEvent, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Plus, GripVertical } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from './ui/button';
import { TaskDialog } from './task-dialog';
import type { Task, TaskPriority } from '@/types';
import { cn } from '@/lib/utils';
import { useDroppable } from '@dnd-kit/core';

// --- Time Slot Data ---
const timeSlots = Array.from({ length: 15 }, (_, i) => {
    const hour = i + 8;
    return `${String(hour).padStart(2, '0')}:00`;
});

// --- Sortable Task Item ---
const DraggableTask = ({ task, isOverlay }: { task: Task, isOverlay?: boolean }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: task.id,
        data: { type: 'task', task },
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div ref={setNodeRef} style={style} className={cn("relative", isDragging && 'opacity-50', isOverlay && 'z-50')}>
            <TaskCard task={task} attributes={attributes} listeners={listeners} />
        </div>
    );
};


// --- Task Card UI ---
const TaskCard = ({ task, attributes, listeners }: { task: Task, attributes: any, listeners: any }) => {
    const priorityColors: Record<TaskPriority, string> = {
        p1: 'bg-red-500',
        p2: 'bg-orange-500',
        p3: 'bg-blue-500',
        p4: 'bg-gray-400',
    };

    return (
        <Card className="mb-2 bg-card/80 backdrop-blur-sm relative group">
            <div className={cn("absolute left-0 top-0 bottom-0 w-1.5 rounded-l-lg", priorityColors[task.priority])} />
            <CardContent className="p-3 pl-4 flex items-center">
                <div className="flex-grow">
                    <p className="font-semibold text-sm">{task.title}</p>
                    {task.description && <p className="text-xs text-muted-foreground">{task.description}</p>}
                </div>
                 <button {...attributes} {...listeners} className="p-2 opacity-50 group-hover:opacity-100 cursor-grab touch-none">
                     <GripVertical className="h-5 w-5" />
                 </button>
            </CardContent>
        </Card>
    );
};

// --- Droppable Time Slot ---
const TimeSlot = ({ time, children }: { time: string; children: React.ReactNode }) => {
    const { setNodeRef, isOver } = useDroppable({ id: time, data: { type: 'timeSlot' } });
    return (
        <div className="flex gap-4">
            <div className="w-16 text-right text-sm text-muted-foreground pt-3">{time}</div>
            <div ref={setNodeRef} className={cn("flex-grow border-l border-dashed pl-4 py-2 min-h-16", isOver && "bg-primary/10")}>
                {children}
            </div>
        </div>
    );
};

// --- Main Planner Component ---
interface PlannerProps {
    date: Date;
    tasks: Task[];
    isLoading: boolean;
    onTaskCreate: (taskData: Omit<Task, 'id' | 'createdAt'>) => void;
    onTaskUpdate: (task: Task) => void;
    onTaskDelete: (taskId: string) => void;
}

export const Planner = ({ date, tasks, isLoading, onTaskCreate, onTaskUpdate }: PlannerProps) => {
    const [activeTask, setActiveTask] = useState<Task | null>(null);

    const { unscheduledTasks, scheduledTasks } = useMemo(() => {
        const tasksForDay = tasks.filter(t => t.dueDate && isSameDay(new Date(t.dueDate), date));
        return {
            unscheduledTasks: tasksForDay.filter(t => !t.time),
            scheduledTasks: tasksForDay.filter(t => !!t.time),
        };
    }, [tasks, date]);

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

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

    const handleDragEnd = (event: DragEndEvent) => {
        setActiveTask(null);
        const { active, over } = event;

        if (!over || !active.data.current) return;
        
        const task = active.data.current.task as Task;
        const overId = over.id as string;
        const overIsTimeSlot = over.data.current?.type === 'timeSlot';

        if (overIsTimeSlot && task.time !== overId) {
            onTaskUpdate({ ...task, time: overId });
        }
    };
    
    const handleDragStart = (event: any) => {
      const { active } = event;
      setActiveTask(active.data.current?.task || null);
    };

    return (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="md:col-span-3">
                    <Card className="h-full">
                        <CardHeader>
                            <CardTitle className="font-headline">Schedule for {format(date, "eeee, MMMM do")}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center h-[calc(100vh-22rem)] gap-2 text-muted-foreground">
                                    <Loader2 className="h-8 w-8 animate-spin" />
                                </div>
                            ) : (
                                <ScrollArea className="h-[calc(100vh-22rem)] pr-4">
                                    {timeSlots.map(time => (
                                        <TimeSlot key={time} time={time}>
                                            <SortableContext items={tasksByTime.get(time)?.map(t => t.id) || []} strategy={verticalListSortingStrategy}>
                                            {(tasksByTime.get(time) || []).map(task => (
                                                <DraggableTask key={task.id} task={task} />
                                            ))}
                                            </SortableContext>
                                        </TimeSlot>
                                    ))}
                                </ScrollArea>
                            )}
                        </CardContent>
                    </Card>
                </div>
                <div className="md:col-span-1">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Unscheduled</CardTitle>
                        </CardHeader>
                        <CardContent>
                             <TaskDialog onSave={(data) => onTaskCreate({...data, dueDate: date, isCompleted: false})} >
                                <Button variant="outline" className="w-full mb-4">
                                    <Plus className="mr-2 h-4 w-4"/> Add Task
                                </Button>
                             </TaskDialog>
                            <ScrollArea className="h-[calc(100vh-26rem)]">
                                <SortableContext items={unscheduledTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                                {unscheduledTasks.map(task => (
                                    <DraggableTask key={task.id} task={task} />
                                ))}
                                </SortableContext>
                                {unscheduledTasks.length === 0 && !isLoading && (
                                    <div className="text-center text-sm text-muted-foreground py-10">No tasks for this day.</div>
                                )}
                                {isLoading && <Loader2 className="mx-auto my-10 h-6 w-6 animate-spin" />}
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </div>
            </div>
             <DragOverlay>
                {activeTask ? <DraggableTask task={activeTask} isOverlay /> : null}
            </DragOverlay>
        </DndContext>
    );
};
