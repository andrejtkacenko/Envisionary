
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, Sparkles, Calendar as CalendarIcon, Edit, Save, X, ChevronLeft, ChevronRight, ListTodo, Trash2, Download } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, addMonths, subMonths, isSameDay, isToday } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { generateSchedule, type GenerateScheduleInput, type GenerateScheduleOutput } from '@/ai/flows/generate-schedule';
import { generateIcs } from '@/ai/flows/generate-ics';
import { saveSchedule, getSchedule, getGoals, type WeeklySchedule, type ScheduledItem, type Goal, type DailyGoalTask, type DailySchedule } from '@/lib/goals-service';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DndContext, closestCenter, DragEndEvent, useSensors, useSensor, PointerSensor } from '@dnd-kit/core';
import { SortableContext, useSortable, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GoalSelectorPopover } from '@/components/goal-selector-popover';
import { cn } from '@/lib/utils';

const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const GenerateScheduleInputSchema = z.object({
    dailyGoals: z.array(z.object({
        day: z.string(),
        tasks: z.array(z.object({
            id: z.string(),
            title: z.string(),
            estimatedTime: z.string().optional(),
        })),
    })),
    timeConstraints: z.string().optional(),
    priorities: z.string().optional(),
});


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
                    <Textarea defaultValue={item.time} onBlur={(e) => handleBlur(e, 'time')} className="h-8 text-xs w-28 resize-none" rows={1} />
                    <Textarea defaultValue={item.task} onBlur={(e) => handleBlur(e, 'task')} className="h-8 text-xs flex-grow resize-none" rows={1} />
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => {e.stopPropagation(); onRemove();}}><X className="h-4 w-4" /></Button>
                </>
            ) : (
                <>
                    <Badge variant="secondary" className="w-24 sm:w-28 justify-center text-xs">{item.time}</Badge>
                    <p className="text-sm flex-grow">{item.task}</p>
                    {item.priority && <Badge variant={item.priority === 'high' ? 'destructive' : item.priority === 'medium' ? 'secondary' : 'outline'}>{item.priority}</Badge>}
                </>
            )}
        </div>
    );
};

const DailyScheduleView = React.memo(function DailyScheduleView({ 
    items, 
    isEditing, 
    onUpdateItem, 
    onRemoveItem 
}: { 
    items: ScheduledItem[], 
    isEditing: boolean, 
    onUpdateItem: (itemIndex: number, time: string, task: string) => void,
    onRemoveItem: (itemIndex: number) => void,
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
    const [schedule, setSchedule] = useState<GenerateScheduleOutput | null>(null);
    const [goals, setGoals] = useState<Goal[]>([]);
    
    // Calendar state
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());

    const form = useForm<GenerateScheduleInput>({
        resolver: zodResolver(GenerateScheduleInputSchema),
        defaultValues: {
            dailyGoals: daysOfWeek.map(day => ({ day, tasks: [] })),
            timeConstraints: "Work from 9 AM to 5 PM on weekdays.",
            priorities: "Focus on completing work tasks, but also make time for exercise and relaxation."
        }
    });
    
    const { fields, update, replace } = useFieldArray({ control: form.control, name: "dailyGoals" });

    const fetchScheduleData = useCallback((uid: string) => {
        setIsDataLoading(true);
        Promise.all([
            getSchedule(uid),
            getGoals(uid)
        ]).then(([savedSchedule, userGoals]) => {
            if (savedSchedule) {
                setSchedule({ weeklySchedule: savedSchedule.scheduleData });
            }
            setGoals(userGoals);
        }).finally(() => setIsDataLoading(false));
    }, []);

    useEffect(() => {
        if (user) {
            fetchScheduleData(user.uid);
        }
    }, [user, fetchScheduleData]);

    const onSubmit = async (data: GenerateScheduleInput) => {
        setIsLoading(true);
        setSchedule(null);
        try {
            const result = await generateSchedule(data);
            setSchedule(result);
            if (user && result) {
                await saveSchedule(user.uid, { id: user.uid, scheduleData: result.weeklySchedule });
                // Refetch to ensure consistency and get latest saved data
                fetchScheduleData(user.uid);
            }
        } catch (error) {
            console.error("Failed to generate schedule", error);
            toast({
                variant: "destructive",
                title: "Generation Failed",
                description: "Could not generate a schedule. Please try again.",
            });
        } finally {
            setIsLoading(false);
        }
    };
    
    const sensors = useSensors(useSensor(PointerSensor, {
        activationConstraint: {
          distance: 8,
        },
    }));

    const currentDayIndex = useMemo(() => {
      // getDay() is 0 for Sunday, 6 for Saturday. We want 0 for Monday, 6 for Sunday.
      return (selectedDate.getDay() + 6) % 7;
    }, [selectedDate]);

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id && schedule) {
            const daySchedule = schedule.weeklySchedule[currentDayIndex].schedule;
            const oldIndex = daySchedule.findIndex(item => item.id === active.id);
            const newIndex = daySchedule.findIndex(item => item.id === over.id);
            
            const newScheduleItems = arrayMove(daySchedule, oldIndex, newIndex);
            
            const newFullSchedule = {
                ...schedule,
                weeklySchedule: schedule.weeklySchedule.map((day, index) => 
                    index === currentDayIndex ? { ...day, schedule: newScheduleItems } : day
                )
            };
            setSchedule(newFullSchedule);
        }
    };

    const handleSaveSchedule = async () => {
        if (!user || !schedule) return;
        setIsLoading(true);
        try {
            await saveSchedule(user.uid, { id: user.uid, scheduleData: schedule.weeklySchedule });
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
            const updatedDaySchedule = [...newSchedule.weeklySchedule[currentDayIndex].schedule];
            updatedDaySchedule[itemIndex] = { ...updatedDaySchedule[itemIndex], time, task };
            newSchedule.weeklySchedule[currentDayIndex] = {...newSchedule.weeklySchedule[currentDayIndex], schedule: updatedDaySchedule};
            return newSchedule;
        });
    };
    
    const removeItem = (itemIndex: number) => {
        if (!schedule) return;
         setSchedule(prev => {
            if (!prev) return null;
            const newSchedule = { ...prev };
            const updatedDaySchedule = [...newSchedule.weeklySchedule[currentDayIndex].schedule];
            updatedDaySchedule.splice(itemIndex, 1);
            newSchedule.weeklySchedule[currentDayIndex] = {...newSchedule.weeklySchedule[currentDayIndex], schedule: updatedDaySchedule};
            return newSchedule;
        });
    };
    
    const handleGoalSelect = (dayIndex: number, goal: Goal) => {
        const tasks: DailyGoalTask[] = goal.subGoals && goal.subGoals.length > 0
            ? goal.subGoals.map(sg => ({ id: sg.id, title: `${goal.title}: ${sg.title}`, estimatedTime: sg.estimatedTime }))
            : [{ id: goal.id, title: goal.title, estimatedTime: goal.estimatedTime }];
        
        const currentTasks = form.getValues(`dailyGoals.${dayIndex}.tasks`);
        update(dayIndex, { day: daysOfWeek[dayIndex], tasks: [...currentTasks, ...tasks] });
    };

    const handleTaskRemove = (dayIndex: number, taskId: string) => {
        const currentTasks = form.getValues(`dailyGoals.${dayIndex}.tasks`);
        update(dayIndex, { day: daysOfWeek[dayIndex], tasks: currentTasks.filter(t => t.id !== taskId) });
    };

    const currentDaySchedule = schedule?.weeklySchedule[currentDayIndex];

    // Calendar logic
    const firstDayOfMonth = startOfMonth(currentMonth);
    const lastDayOfMonth = endOfMonth(currentMonth);
    const daysInMonth = eachDayOfInterval({
        start: startOfWeek(firstDayOfMonth),
        end: endOfWeek(lastDayOfMonth),
    });
    const goToNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const goToPreviousMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
    const hasScheduleForDay = (day: Date) => {
        const index = (day.getDay() + 6) % 7;
        return schedule?.weeklySchedule[index]?.schedule.length > 0;
    };
    
    const [isDownloading, setIsDownloading] = useState(false);
    const handleDownloadIcs = async () => {
        if (!currentDaySchedule) {
            toast({ variant: 'destructive', title: 'No schedule to download.' });
            return;
        }
        setIsDownloading(true);

        try {
            const { icsString } = await generateIcs({ schedule: currentDaySchedule, date: selectedDate.toISOString() });
            if (!icsString) {
                throw new Error("Failed to generate .ics data.");
            }
            const blob = new Blob([icsString], { type: 'text/calendar' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `schedule-${format(selectedDate, 'yyyy-MM-dd')}.ics`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            toast({
                title: "Schedule Downloaded",
                description: "You can import the .ics file into your calendar app.",
            });
        } catch (error) {
            console.error("Failed to generate or download .ics file", error);
            toast({
                variant: "destructive",
                title: "Download Failed",
                description: "Could not create the calendar file. Please try again.",
            });
        } finally {
            setIsDownloading(false);
        }
    };


    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
                        <CalendarIcon /> AI Planner
                    </h1>
                    <p className="text-muted-foreground">
                        Define your week, generate a schedule, and export it to your calendar.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Calendar + Definer */}
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
                                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
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
                                            hasScheduleForDay(day) && !isSameDay(day, selectedDate) && "bg-accent/20"
                                        )}
                                    >
                                        <span>{format(day, 'd')}</span>
                                        {hasScheduleForDay(day) && <div className="absolute bottom-1 h-1 w-1 rounded-full bg-accent"></div>}
                                    </button>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Define Your Week</CardTitle>
                            <CardDescription>Select goals, set priorities and constraints.</CardDescription>
                        </CardHeader>
                        <CardContent>
                             {isDataLoading ? (
                                <div className="flex items-center justify-center h-64">
                                    <Loader2 className="h-8 w-8 animate-spin" />
                                </div>
                            ) : (
                            <Form {...form}>
                                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                                    <FormField
                                        control={form.control}
                                        name="priorities"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Weekly Priorities</FormLabel>
                                                <FormControl>
                                                    <Textarea placeholder="e.g., Health, project deadlines..." {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="timeConstraints"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Time Constraints</FormLabel>
                                                <FormControl>
                                                    <Textarea placeholder="e.g., Work 9-5, gym MWF evenings" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <div>
                                        <FormLabel>Daily Goals</FormLabel>
                                        <ScrollArea className="h-80 w-full mt-2">
                                            <div className="space-y-4 pr-4">
                                                {fields.map((field, index) => (
                                                    <div key={field.id} className="space-y-2 rounded-lg border p-3">
                                                        <div className="flex justify-between items-center">
                                                            <h4 className="font-medium">{daysOfWeek[index]}</h4>
                                                             <GoalSelectorPopover goals={goals} onGoalSelect={(goal) => handleGoalSelect(index, goal)} />
                                                        </div>
                                                        {field.tasks.length > 0 ? (
                                                            <div className="space-y-1">
                                                                {field.tasks.map(task => (
                                                                    <div key={task.id} className="flex items-center justify-between text-sm p-1.5 bg-muted/50 rounded-md">
                                                                        <span className="truncate pr-2">{task.title}</span>
                                                                        <Button variant="ghost" size="icon" className="h-5 w-5 flex-shrink-0" onClick={() => handleTaskRemove(index, task.id)}>
                                                                            <Trash2 className="h-3 w-3" />
                                                                        </Button>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <p className="text-xs text-muted-foreground text-center py-2">No goals selected.</p>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </ScrollArea>
                                    </div>
                                    <Button type="submit" className="w-full" disabled={isLoading}>
                                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                                        Generate Full Week Schedule
                                    </Button>
                                </form>
                            </Form>
                            )}
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
                                                <Button variant="outline" onClick={() => setIsEditing(false)}>
                                                    <X className="mr-2 h-4 w-4" /> Cancel
                                                </Button>
                                                <Button onClick={handleSaveSchedule} disabled={isLoading}>
                                                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save
                                                </Button>
                                            </>
                                        ) : (
                                            <>
                                                <Button variant="outline" onClick={handleDownloadIcs} disabled={isDownloading}>
                                                    {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                                                </Button>
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
                            {isLoading && !schedule && (
                                <div className="flex flex-col items-center justify-center h-96 gap-2 text-muted-foreground">
                                    <Loader2 className="h-8 w-8 animate-spin" />
                                    <p>Generating your schedule...</p>
                                </div>
                            )}
                            {isDataLoading && !schedule && !isLoading && (
                                <div className="flex flex-col items-center justify-center h-96 gap-2 text-muted-foreground">
                                    <Loader2 className="h-8 w-8 animate-spin" />
                                    <p>Loading your data...</p>
                                </div>
                            )}
                            {!isDataLoading && !isLoading && (!schedule || !currentDaySchedule || currentDaySchedule.schedule.length === 0) && (
                                <div className="flex flex-col items-center justify-center h-96 gap-2 text-muted-foreground">
                                    <ListTodo className="h-12 w-12" />
                                    <p>No schedule for this day.</p>
                                    <p className="text-xs">Generate a schedule or select a different day.</p>
                                </div>
                            )}
                            {schedule && currentDaySchedule && currentDaySchedule.schedule.length > 0 && (
                                <ScrollArea className="h-[calc(100vh-22rem)]">
                                     <DndContext sensors={sensors} onDragEnd={handleDragEnd} collisionDetection={closestCenter}>
                                        <DailyScheduleView 
                                            items={currentDaySchedule.schedule}
                                            isEditing={isEditing}
                                            onUpdateItem={updateItem}
                                            onRemoveItem={removeItem}
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
