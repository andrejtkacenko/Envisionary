
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, Sparkles, Calendar, Edit, Save, X, ChevronLeft, ChevronRight, ListTodo, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { generateSchedule, type GenerateScheduleInput, type GenerateScheduleOutput } from '@/ai/flows/generate-schedule';
import { saveSchedule, getSchedule, getGoals, type WeeklySchedule, type ScheduledItem, type Goal, type DailyGoalTask } from '@/lib/goals-service';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DndContext, closestCenter, DragEndEvent, useSensors, useSensor, PointerSensor } from '@dnd-kit/core';
import { SortableContext, useSortable, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GoalSelectorPopover } from '@/components/goal-selector-popover';

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
    const handleBlur = (e: React.FocusEvent<HTMLInputElement>, field: 'time' | 'task') => {
        e.stopPropagation();
        onUpdate(field === 'time' ? e.target.value : item.time, field === 'task' ? e.target.value : item.task);
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
    const [currentDayIndex, setCurrentDayIndex] = useState(new Date().getDay() - 1); 

    const form = useForm<GenerateScheduleInput>({
        resolver: zodResolver(GenerateScheduleInputSchema),
        defaultValues: {
            dailyGoals: daysOfWeek.map(day => ({ day, tasks: [] })),
            timeConstraints: "Work from 9 AM to 5 PM on weekdays.",
            priorities: "Focus on completing work tasks, but also make time for exercise and relaxation."
        }
    });

    const { fields, update, replace } = useFieldArray({ control: form.control, name: "dailyGoals" });

    useEffect(() => {
        if (user) {
            setIsDataLoading(true);
            Promise.all([
                getSchedule(user.uid),
                getGoals(user.uid)
            ]).then(([savedSchedule, userGoals]) => {
                if (savedSchedule) {
                    setSchedule({ weeklySchedule: savedSchedule.scheduleData });
                }
                setGoals(userGoals);
            }).finally(() => setIsDataLoading(false));
        }
    }, [user]);

    const onSubmit = async (data: GenerateScheduleInput) => {
        setIsLoading(true);
        setSchedule(null);
        try {
            const result = await generateSchedule(data);
            setSchedule(result);
            if (user && result) {
                await saveSchedule(user.uid, { id: user.uid, scheduleData: result.weeklySchedule });
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

    const goToPreviousDay = () => {
        setCurrentDayIndex(prev => (prev > 0 ? prev - 1 : daysOfWeek.length - 1));
    }
    const goToNextDay = () => {
        setCurrentDayIndex(prev => (prev < daysOfWeek.length - 1 ? prev + 1 : 0));
    }
    
    const currentDaySchedule = schedule?.weeklySchedule[currentDayIndex];


    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
                        <Calendar /> AI Weekly Planner
                    </h1>
                    <p className="text-muted-foreground">
                        Select goals for each day and let AI create an optimized schedule for you.
                    </p>
                </div>
                {schedule && (
                    <div className="flex gap-2">
                        {isEditing ? (
                            <>
                                <Button variant="outline" onClick={() => setIsEditing(false)}>
                                    <X className="mr-2 h-4 w-4" /> Cancel
                                </Button>
                                <Button onClick={handleSaveSchedule} disabled={isLoading}>
                                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                    Save
                                </Button>
                            </>
                        ) : (
                            <Button onClick={() => setIsEditing(true)}>
                                <Edit className="mr-2 h-4 w-4" /> Edit
                            </Button>
                        )}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1">
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
                                        Generate Schedule
                                    </Button>
                                </form>
                            </Form>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <div className="lg:col-span-2">
                    <Card className="h-full">
                        <CardHeader>
                            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                                 <div>
                                    <CardTitle>Your AI-Generated Schedule</CardTitle>
                                    <CardDescription>Drag and drop to reorder tasks in edit mode.</CardDescription>
                                 </div>
                                 <div className="flex items-center gap-2 w-full sm:w-auto">
                                    <Button variant="outline" size="icon" onClick={goToPreviousDay}>
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                    <span className="font-semibold text-lg w-full sm:w-28 text-center">{daysOfWeek[currentDayIndex]}</span>
                                     <Button variant="outline" size="icon" onClick={goToNextDay}>
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                 </div>
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
                            {!isDataLoading && !isLoading && !schedule && (
                                <div className="flex flex-col items-center justify-center h-96 gap-2 text-muted-foreground">
                                    <ListTodo className="h-12 w-12" />
                                    <p>Your schedule will appear here once generated.</p>
                                    <p className="text-xs">Select some goals on the left to start.</p>
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
