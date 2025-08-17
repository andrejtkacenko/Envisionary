
"use client";

import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, Sparkles, Calendar, Edit, Save, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { generateSchedule, type GenerateScheduleInput, type GenerateScheduleOutput } from '@/ai/flows/generate-schedule';
import { saveSchedule, getSchedule, type WeeklySchedule, type ScheduledItem } from '@/lib/goals-service';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DndContext, closestCenter, DragEndEvent, useSensors, useSensor, PointerSensor } from '@dnd-kit/core';
import { SortableContext, useSortable, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

// Re-define schema here as it cannot be exported from the "use server" file
const GenerateScheduleInputSchema = z.object({
    dailyGoals: z.array(z.object({
        day: z.string(),
        tasks: z.string(),
    })),
    timeConstraints: z.string().optional(),
    priorities: z.string().optional(),
});


const SortableItem = ({ id, item, isEditing, onUpdate, onRemove }: { id: string, item: ScheduledItem, isEditing: boolean, onUpdate: (time: string, task: string) => void, onRemove: () => void }) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="flex items-center gap-2 p-2 bg-muted/50 rounded-md touch-none">
            {isEditing ? (
                <>
                    <Input defaultValue={item.time} onBlur={(e) => onUpdate(e.target.value, item.task)} className="h-8 text-xs" />
                    <Input defaultValue={item.task} onBlur={(e) => onUpdate(item.time, e.target.value)} className="h-8 text-xs" />
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onRemove}><X className="h-4 w-4" /></Button>
                </>
            ) : (
                <>
                    <Badge variant="secondary" className="w-28 justify-center">{item.time}</Badge>
                    <p className="text-sm flex-grow">{item.task}</p>
                    {item.priority && <Badge variant={item.priority === 'high' ? 'destructive' : item.priority === 'medium' ? 'secondary' : 'outline'}>{item.priority}</Badge>}
                </>
            )}
        </div>
    );
};

export default function PlannerPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [schedule, setSchedule] = useState<GenerateScheduleOutput | null>(null);
    const [currentDayIndex, setCurrentDayIndex] = useState(0);

    const form = useForm<GenerateScheduleInput>({
        resolver: zodResolver(GenerateScheduleInputSchema),
        defaultValues: {
            dailyGoals: daysOfWeek.map(day => ({ day, tasks: "" })),
            timeConstraints: "Work from 9 AM to 5 PM on weekdays.",
            priorities: "Focus on completing work tasks, but also make time for exercise and relaxation."
        }
    });

    const { fields } = useFieldArray({ control: form.control, name: "dailyGoals" });

    useEffect(() => {
        if (user) {
            getSchedule(user.uid).then(savedSchedule => {
                if (savedSchedule) {
                    setSchedule({ weeklySchedule: savedSchedule.scheduleData });
                }
            });
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
        const newSchedule = { ...schedule };
        newSchedule.weeklySchedule[currentDayIndex].schedule[itemIndex] = { ...newSchedule.weeklySchedule[currentDayIndex].schedule[itemIndex], time, task };
        setSchedule(newSchedule);
    };
    
    const removeItem = (itemIndex: number) => {
        if (!schedule) return;
        const newSchedule = { ...schedule };
        newSchedule.weeklySchedule[currentDayIndex].schedule.splice(itemIndex, 1);
        setSchedule(newSchedule);
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
            <div className="flex items-center justify-between space-y-2">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
                        <Calendar /> AI Weekly Planner
                    </h1>
                    <p className="text-muted-foreground">
                        Define your weekly goals and let AI create an optimized schedule for you.
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
                                    Save Schedule
                                </Button>
                            </>
                        ) : (
                            <Button onClick={() => setIsEditing(true)}>
                                <Edit className="mr-2 h-4 w-4" /> Edit Schedule
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
                            <CardDescription>Enter tasks, priorities, and constraints.</CardDescription>
                        </CardHeader>
                        <CardContent>
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
                                        <div className="space-y-4 mt-2">
                                            {fields.map((field, index) => (
                                                <FormField
                                                    key={field.id}
                                                    control={form.control}
                                                    name={`dailyGoals.${index}.tasks`}
                                                    render={({ field: fieldProps }) => (
                                                        <FormItem>
                                                            <FormLabel className="font-normal">{daysOfWeek[index]}</FormLabel>
                                                            <FormControl>
                                                                <Input placeholder="e.g., Workout, finish report" {...fieldProps} />
                                                            </FormControl>
                                                        </FormItem>
                                                    )}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                    <Button type="submit" className="w-full" disabled={isLoading}>
                                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                                        Generate Schedule
                                    </Button>
                                </form>
                            </Form>
                        </CardContent>
                    </Card>
                </div>

                <div className="lg:col-span-2">
                    <Card className="h-full">
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                 <div>
                                    <CardTitle>Your AI-Generated Schedule</CardTitle>
                                    <CardDescription>Drag and drop to reorder tasks in edit mode.</CardDescription>
                                 </div>
                                 <div className="flex items-center gap-2">
                                    <Button variant="outline" size="icon" onClick={goToPreviousDay}>
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                    <span className="font-semibold text-lg w-28 text-center">{daysOfWeek[currentDayIndex]}</span>
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
                                    <p>Generating your optimized week...</p>
                                </div>
                            )}
                            {!isLoading && !schedule && (
                                <div className="flex flex-col items-center justify-center h-96 gap-2 text-muted-foreground">
                                    <Calendar className="h-12 w-12" />
                                    <p>Your schedule will appear here once generated.</p>
                                </div>
                            )}
                            {schedule && currentDaySchedule && (
                                <ScrollArea className="h-[calc(100vh-20rem)]">
                                    <DndContext sensors={sensors} onDragEnd={handleDragEnd} collisionDetection={closestCenter}>
                                        <SortableContext items={currentDaySchedule.schedule.map(i => i.id)} strategy={verticalListSortingStrategy}>
                                            <div className="space-y-2 pr-4">
                                                {currentDaySchedule.schedule.map((item, itemIndex) => (
                                                    <SortableItem 
                                                        key={item.id} 
                                                        id={item.id}
                                                        item={item} 
                                                        isEditing={isEditing}
                                                        onUpdate={(time, task) => updateItem(itemIndex, time, task)}
                                                        onRemove={() => removeItem(itemIndex)}
                                                    />
                                                ))}
                                            </div>
                                        </SortableContext>
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
