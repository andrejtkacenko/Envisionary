
"use client";

import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, ListTodo, Plus, GripVertical, Loader2 } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, addMonths, subMonths, isSameDay, isToday } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Planner } from '@/components/planner';
import { useTasks } from '@/hooks/use-tasks';
import { DndContext, DragEndEvent, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Task, TaskPriority } from '@/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TaskDialog } from '@/components/ui/task-dialog';


// --- Draggable Task Components (moved here to share between unscheduled and planner) ---

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


export default function TasksPage() {
    const { tasksForDay, isLoading, handleAddTask, handleUpdateTask, handleDeleteTask } = useTasks();
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [activeTask, setActiveTask] = useState<Task | null>(null);

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
        tasksForDay.forEach(task => {
            if (task.dueDate) {
                const dateKey = format(new Date(task.dueDate), 'yyyy-MM-dd');
                map.set(dateKey, (map.get(dateKey) || 0) + 1);
            }
        });
        return map;
    }, [tasksForDay]);
    
    const todaysTasks = useMemo(() => tasksForDay.filter(t => t.dueDate && isSameDay(new Date(t.dueDate), selectedDate)), [tasksForDay, selectedDate]);
    const unscheduledTasks = useMemo(() => todaysTasks.filter(t => !t.time), [todaysTasks]);

    const hasTasksForDay = (day: Date) => {
        const dateKey = format(day, 'yyyy-MM-dd');
        return tasksByDate.has(dateKey);
    };
    
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

    const handleDragEnd = (event: DragEndEvent) => {
        setActiveTask(null);
        const { active, over } = event;

        if (!over || !active.data.current) return;
        
        const task = active.data.current.task as Task;
        const overId = over.id as string;
        const overIsTimeSlot = over.data.current?.type === 'timeSlot';

        if (overIsTimeSlot && task.time !== overId) {
            handleUpdateTask({ ...task, time: overId });
        }
    };
    
    const handleDragStart = (event: any) => {
      const { active } = event;
      setActiveTask(active.data.current?.task || null);
    };

    return (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
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
                    {/* Left Column: Calendar & Unscheduled Tasks */}
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
                        
                        <Card>
                             <CardHeader>
                                <CardTitle className="text-lg">Unscheduled</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <TaskDialog onSave={(data) => handleAddTask({...data, dueDate: selectedDate, isCompleted: false})} >
                                    <Button variant="outline" className="w-full mb-4">
                                        <Plus className="mr-2 h-4 w-4"/> Add Task
                                    </Button>
                                </TaskDialog>
                                <ScrollArea className="h-96">
                                    <SortableContext items={unscheduledTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                                    {unscheduledTasks.map(task => (
                                        <DraggableTask key={task.id} task={task} />
                                    ))}
                                    </SortableContext>
                                    {unscheduledTasks.length === 0 && !isLoading && (
                                        <div className="text-center text-sm text-muted-foreground py-10">No unscheduled tasks for this day.</div>
                                    )}
                                    {isLoading && <Loader2 className="mx-auto my-10 h-6 w-6 animate-spin" />}
                                </ScrollArea>
                            </CardContent>
                        </Card>

                    </div>

                    {/* Right Column: Planner View */}
                    <div className="lg:col-span-3">
                        <Planner
                            date={selectedDate}
                            tasks={todaysTasks}
                            isLoading={isLoading}
                            onTaskCreate={handleAddTask}
                            onTaskUpdate={handleUpdateTask}
                            onTaskDelete={handleDeleteTask}
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
