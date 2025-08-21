
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, Plus, Calendar as CalendarIcon, Edit, Save, X, ChevronLeft, ChevronRight, ListTodo } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, addMonths, subMonths, isSameDay, isToday } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { saveSchedule, getSchedule, getGoalsSnapshot, type WeeklySchedule, type ScheduledItem, type Goal, type DailySchedule } from '@/lib/goals-service';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DndContext, closestCenter, DragEndEvent, useSensors, useSensor, PointerSensor } from '@dnd-kit/core';
import { SortableContext, useSortable, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { nanoid } from 'nanoid';

const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const SortableItem = ({ item, isEditing, onUpdate, onRemove }: { item: ScheduledItem, isEditing: boolean, onUpdate: (time: string, task: string) => void, onRemove: () => void }) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };
    
    // We need to stop propagation on blur events to prevent the drag-and-drop context from interfering.
    const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>, field: 'time' | 'task') => {
        e.stopPropagation();
        const target = e.target as HTMLInputElement | HTMLTextAreaElement;
        onUpdate(field === 'time' ? target.value : item.time, field === 'task' ? target.value : item.task);
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="flex items-center gap-2 p-2 bg-muted/50 rounded-md touch-none">
            {isEditing ? (
                <>
                    <Input defaultValue={item.time} onBlur={(e) => handleBlur(e, 'time')} className="h-8 text-xs w-28" />
                    <Input defaultValue={item.task} onBlur={(e) => handleBlur(e, 'task')} className="h-8 text-xs flex-grow" />
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => {e.stopPropagation(); onRemove();}}><X className="h-4 w-4" /></Button>
                </>
            ) : (
                <>
                    <Badge variant="secondary" className="w-24 sm:w-28 justify-center text-xs">{item.time}</Badge>
                    <p className="text-sm flex-grow">{item.task}</p>
                    <Badge variant={!item.priority ? "outline" : item.priority === 'high' ? 'destructive' : item.priority === 'medium' ? 'secondary' : 'outline'}>
                        {!item.priority ? <ListTodo className="h-3 w-3" /> : item.priority}
                    </Badge>
                </>
            )}
        </div>
    );
};

const DailyScheduleView = React.memo(function DailyScheduleView({ 
    items, 
    isEditing, 
    onUpdateItem, 
    onRemoveItem,
    onAddItem,
}: { 
    items: ScheduledItem[], 
    isEditing: boolean, 
    onUpdateItem: (itemIndex: number, time: string, task: string) => void,
    onRemoveItem: (itemIndex: number) => void,
    onAddItem: () => void;
}) {
    const itemIds = useMemo(() => items.map(i => i.id), [items]);

    return (
        <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
            <div className="space-y-2 pr-4">
                {items.map((item, itemIndex) => (
                    <SortableItem 
                        key={`${item.id}-${itemIndex}`}
                        item={item} 
                        isEditing={isEditing}
                        onUpdate={(time, task) => onUpdateItem(itemIndex, time, task)}
                        onRemove={() => onRemoveItem(itemIndex)}
                    />
                ))}
                {isEditing && (
                    <Button variant="outline" className="w-full" onClick={onAddItem}>
                        <Plus className="h-4 w-4 mr-2" /> Add Task
                    </Button>
                )}
            </div>
        </SortableContext>
    );
});
DailyScheduleView.displayName = "DailyScheduleView";


export default function PlannerPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [isDataLoading, setIsDataLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [schedule, setSchedule] = useState<WeeklySchedule | null>(null);
    const [goals, setGoals] = useState<Goal[]>([]);
    
    // Calendar state
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());

    const fetchScheduleData = useCallback((uid: string) => {
        setIsDataLoading(true);
        getSchedule(uid).then((savedSchedule) => {
            if (savedSchedule && savedSchedule.scheduleData.length > 0) {
                 // Ensure all items have a unique ID
                const scheduleWithIds = {
                    ...savedSchedule,
                    scheduleData: savedSchedule.scheduleData.map(day => ({
                        ...day,
                        schedule: day.schedule.map(item => ({
                            ...item,
                            id: item.id || nanoid(),
                        })),
                    })),
                };
                setSchedule(scheduleWithIds);
            } else {
                // If no schedule exists, create a blank one
                setSchedule({
                    id: 'current_week',
                    scheduleData: daysOfWeek.map(day => ({ day, schedule: [] })),
                });
            }
        }).finally(() => setIsDataLoading(false));
    }, []);

    useEffect(() => {
        if (user) {
            fetchScheduleData(user.uid);
            getGoalsSnapshot(user.uid).then(setGoals);
        }
    }, [user, fetchScheduleData]);
    
    const sensors = useSensors(useSensor(PointerSensor, {
        activationConstraint: {
          distance: 8,
        },
    }));

    const currentDayIndex = useMemo(() => {
      // getDay() is 0 for Sunday, 6 for Saturday. We want 0 for Monday, 6 for Sunday.
      const dayOfWeek = selectedDate.getDay();
      return dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    }, [selectedDate]);
    
    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id && schedule) {
            const daySchedule = schedule.scheduleData[currentDayIndex].schedule;
            const oldIndex = daySchedule.findIndex(item => item.id === active.id);
            const newIndex = daySchedule.findIndex(item => item.id === over.id);
            
            const newFullSchedule = {
                ...schedule,
                scheduleData: schedule.scheduleData.map((day, index) => 
                    index === currentDayIndex ? { ...day, schedule: arrayMove(daySchedule, oldIndex, newIndex) } : day
                )
            };
            setSchedule(newFullSchedule);
        }
    };

    const handleSaveSchedule = async () => {
        if (!user || !schedule) return;
        setIsLoading(true);
        try {
            await saveSchedule(user.uid, schedule);
            toast({ title: "Schedule Saved", description: "Your weekly schedule has been updated." });
            setIsEditing(false);
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Save failed" });
        } finally {
            setIsLoading(false);
        }
    };

    const updateItem = (itemIndex: number, time: string, task: string) => {
        if (!schedule) return;
        setSchedule(prev => {
            if (!prev) return null;
            const newSchedule = { ...prev };
            const updatedDaySchedule = [...newSchedule.scheduleData[currentDayIndex].schedule];
            updatedDaySchedule[itemIndex] = { ...updatedDaySchedule[itemIndex], time, task };
            newSchedule.scheduleData[currentDayIndex] = {...newSchedule.scheduleData[currentDayIndex], schedule: updatedDaySchedule};
            return newSchedule;
        });
    };
    
    const removeItem = (itemIndex: number) => {
        if (!schedule) return;
         setSchedule(prev => {
            if (!prev) return null;
            const newSchedule = { ...prev };
            const updatedDaySchedule = [...newSchedule.scheduleData[currentDayIndex].schedule];
            updatedDaySchedule.splice(itemIndex, 1);
            newSchedule.scheduleData[currentDayIndex] = {...newSchedule.scheduleData[currentDayIndex], schedule: updatedDaySchedule};
            return newSchedule;
        });
    };

    const addItem = () => {
        if (!schedule) return;
        setSchedule(prev => {
            if (!prev) return null;
            const newSchedule = { ...prev };
            const updatedDaySchedule = [...newSchedule.scheduleData[currentDayIndex].schedule];
            updatedDaySchedule.push({ id: nanoid(), time: '12:00 PM', task: 'New Task', priority: 'medium' });
            newSchedule.scheduleData[currentDayIndex] = {...newSchedule.scheduleData[currentDayIndex], schedule: updatedDaySchedule};
            return newSchedule;
        });
    }
    
    const currentDaySchedule = schedule?.scheduleData[currentDayIndex];

    // Calendar logic
    const firstDayOfMonth = startOfMonth(currentMonth);
    const lastDayOfMonth = endOfMonth(currentMonth);
    const daysInMonth = eachDayOfInterval({
        start: startOfWeek(firstDayOfMonth, { weekStartsOn: 1 }), // Monday
        end: endOfWeek(lastDayOfMonth, { weekStartsOn: 1 }), // Monday
    });
    const goToNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const goToPreviousMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
    const hasScheduleForDay = (day: Date) => {
        const dayOfWeek = day.getDay();
        const index = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        return schedule?.scheduleData[index]?.schedule.length > 0;
    };
    
    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
                        <CalendarIcon /> AI Planner
                    </h1>
                    <p className="text-muted-foreground">
                        Create schedule templates based on your goals, then customize and plan your week.
                    </p>
                </div>
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
                                            hasScheduleForDay(day) && !isSameDay(day, selectedDate) && "bg-accent"
                                        )}
                                    >
                                        <span>{format(day, 'd')}</span>
                                        {hasScheduleForDay(day) && <div className="absolute bottom-1.5 h-1.5 w-1.5 rounded-full bg-accent-foreground/50"></div>}
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
                                    <CardTitle>Schedule for {format(selectedDate, "eeee, MMMM do")}</CardTitle>
                                    <CardDescription>Drag and drop to reorder tasks in edit mode.</CardDescription>
                                </div>
                                {currentDaySchedule && (
                                    <div className="flex gap-2 w-full sm:w-auto">
                                        {isEditing ? (
                                            <>
                                                <Button variant="outline" onClick={() => {setIsEditing(false); fetchScheduleData(user!.uid); }}>
                                                    <X className="mr-2 h-4 w-4" /> Cancel
                                                </Button>
                                                <Button onClick={handleSaveSchedule} disabled={isLoading}>
                                                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save
                                                </Button>
                                            </>
                                        ) : (
                                            <>
                                                <Button onClick={() => setIsEditing(true)}>
                                                    <Edit className="mr-2 h-4 w-4" /> Edit
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent>
                            {isDataLoading && (
                                <div className="flex flex-col items-center justify-center h-96 gap-2 text-muted-foreground">
                                    <Loader2 className="h-8 w-8 animate-spin" />
                                    <p>Loading your data...</p>
                                </div>
                            )}
                            {!isDataLoading && (!schedule || !currentDaySchedule || currentDaySchedule.schedule.length === 0) && (
                                <div className="flex flex-col items-center justify-center h-96 gap-2 text-muted-foreground">
                                    <ListTodo className="h-12 w-12" />
                                    <p>No schedule for this day.</p>
                                    <p className="text-xs">Create a schedule or apply a template.</p>
                                </div>
                            )}
                            {schedule && currentDaySchedule && (
                                <ScrollArea className="h-[calc(100vh-22rem)]">
                                     <DndContext sensors={sensors} onDragEnd={handleDragEnd} collisionDetection={closestCenter}>
                                        <DailyScheduleView 
                                            items={currentDaySchedule.schedule}
                                            isEditing={isEditing}
                                            onUpdateItem={updateItem}
                                            onRemoveItem={removeItem}
                                            onAddItem={addItem}
                                        />
                                    </DndContext>
                                </ScrollArea>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

    