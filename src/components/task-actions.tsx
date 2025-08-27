
"use client";

import React, { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, Sparkles, Plus, Trash2, Wand2, FileText, Calendar, Save } from 'lucide-react';

import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { generateSchedule } from '@/ai/flows/generate-schedule';
import { addScheduleTemplate } from '@/lib/goals-service';
import type { DailySchedule, Goal } from '@/types';
import { Checkbox } from './ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';

// --- PROPS ---
interface TaskActionsProps {
    onScheduleApplied: (schedule: DailySchedule[]) => void;
    allGoals: Goal[];
}

// --- SCHEMAS ---
const generatorSchema = z.object({
  priorities: z.string().min(1, "Please describe your priorities."),
  workHours: z.string().min(1, "Please enter your work hours."),
  sleepHours: z.string().min(1, "Please enter your sleep hours."),
  habits: z.string().min(1, "Please describe your habits."),
  commitments: z.string().min(1, "Please enter your commitments."),
  mealHours: z.string().min(1, "Please describe your meal preferences."),
  restHours: z.string().min(1, "Please describe your rest preferences."),
});
type GeneratorFormValues = z.infer<typeof generatorSchema>;

const saveTemplateSchema = z.object({
    name: z.string().min(3, "Template name must be at least 3 characters."),
});
type SaveTemplateFormValues = z.infer<typeof saveTemplateSchema>;


// --- HELPER COMPONENTS ---
const SuggestionButton = ({ children, onClick }: { children: React.ReactNode, onClick: () => void}) => (
    <Button type="button" variant="outline" size="sm" className="text-xs h-auto py-1 px-2" onClick={onClick}>
        {children}
    </Button>
);

const ScheduleViewer = ({ schedule, onApply, onSave, onBack }: { schedule: DailySchedule[], onApply: () => void, onSave: (name: string) => Promise<void>, onBack: () => void }) => {
    const [isSaving, setIsSaving] = useState(false);
    const [showSaveDialog, setShowSaveDialog] = useState(false);
    const saveForm = useForm<SaveTemplateFormValues>({ resolver: zodResolver(saveTemplateSchema) });

    const handleSaveSubmit = async (data: SaveTemplateFormValues) => {
        setIsSaving(true);
        await onSave(data.name);
        setIsSaving(false);
        setShowSaveDialog(false);
    };
    
    return (
        <div className="flex flex-col h-full">
            <DialogHeader>
                <DialogTitle>Generated Schedule</DialogTitle>
                <DialogDescription>Review the schedule below or go back to regenerate.</DialogDescription>
            </DialogHeader>
            <ScrollArea className="my-4 flex-grow border rounded-md">
                <div className="p-4 space-y-4">
                    {schedule.map(day => (
                        <div key={day.day}>
                            <h3 className="font-semibold text-lg mb-2">{day.day}</h3>
                            <div className="space-y-2">
                                {day.schedule.length > 0 ? day.schedule.map(item => (
                                    <div key={item.id} className="p-2 bg-muted/50 rounded-md text-sm">
                                        <span className="font-medium">{item.time}:</span> {item.task}
                                    </div>
                                )) : <p className="text-sm text-muted-foreground">No items scheduled.</p>}
                            </div>
                        </div>
                    ))}
                </div>
            </ScrollArea>
             <DialogFooter className="flex-shrink-0">
                <Button variant="outline" onClick={onBack}>Back to Generator</Button>
                <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
                    <DialogTrigger asChild>
                        <Button variant="secondary"><Save className="mr-2 h-4 w-4"/> Save as Template</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Save Template</DialogTitle>
                            <DialogDescription>Give your new schedule template a name.</DialogDescription>
                        </DialogHeader>
                        <Form {...saveForm}>
                            <form onSubmit={saveForm.handleSubmit(handleSaveSubmit)} className="space-y-4">
                                <FormField
                                    control={saveForm.control} name="name"
                                    render={({ field }) => (<FormItem><FormLabel>Template Name</FormLabel><FormControl><Input placeholder="e.g., My Productive Week" {...field} /></FormControl><FormMessage /></FormItem>)}
                                />
                                <DialogFooter>
                                    <Button type="submit" disabled={isSaving}>
                                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>}
                                        Save Template
                                    </Button>
                                </DialogFooter>
                            </form>
                        </Form>
                    </DialogContent>
                </Dialog>
                <Button onClick={onApply}>Apply to Planner</Button>
            </DialogFooter>
        </div>
    );
};


// --- MAIN COMPONENT ---
export function TaskActions({ allGoals, onScheduleApplied }: TaskActionsProps) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    
    // Generator State
    const [isGeneratingSchedule, setIsGeneratingSchedule] = useState(false);
    const [generatedSchedule, setGeneratedSchedule] = useState<DailySchedule[] | null>(null);
    const [selectedGoals, setSelectedGoals] = useState<string[]>([]);

    // Form
    const form = useForm<GeneratorFormValues>({
        resolver: zodResolver(generatorSchema),
        defaultValues: { 
            priorities: "Work is the main priority, but I want to dedicate evenings to learning.",
            workHours: "9 AM to 5 PM, Mon-Fri",
            sleepHours: "11 PM to 7 AM",
            habits: "Gym 3 times a week in the morning, daily 15-min meditation.",
            commitments: "Team meeting every Monday at 10 AM.",
            mealHours: "Lunch around 1 PM, Dinner around 7 PM.",
            restHours: "Short breaks during work, and want evenings free on weekends.",
        },
    });

    const handleGenerateSchedule = async (values: GeneratorFormValues) => {
        if (!user) return;
        setIsGeneratingSchedule(true);
        setGeneratedSchedule(null);
        
        const goalsToInclude = allGoals.filter(g => selectedGoals.includes(g.id)).map(g => ({
            id: g.id,
            title: g.title,
            estimatedTime: g.estimatedTime,
        }));

        try {
            const { weeklySchedule } = await generateSchedule({
                preferences: values,
                goals: goalsToInclude,
            });

            if (!weeklySchedule || weeklySchedule.length === 0) {
                toast({ title: "Generation failed", description: "AI could not create a schedule. Try a different description."});
            } else {
                setGeneratedSchedule(weeklySchedule);
            }
        } catch (error) {
             console.error("Failed to generate schedule", error);
             toast({ variant: 'destructive', title: 'Generation failed', description: 'An error occurred while creating the schedule.' });
        } finally {
            setIsGeneratingSchedule(false);
        }
    };

    const handleApplySchedule = () => {
        if (generatedSchedule) {
            onScheduleApplied(generatedSchedule);
            setIsDialogOpen(false);
        }
    };
    
    const handleSaveTemplate = async (name: string) => {
        if (!user || !generatedSchedule) return;
        try {
            await addScheduleTemplate(user.uid, {
                name,
                type: 'week',
                data: generatedSchedule
            });
            toast({ title: "Template Saved!", description: `"${name}" is now available to use.` });
        } catch (error) {
            console.error("Failed to save template", error);
            toast({ variant: 'destructive', title: 'Save Failed', description: 'Could not save the schedule as a template.' });
        }
    }
    
    const handleGoalToggle = (goalId: string) => {
        setSelectedGoals(prev => 
            prev.includes(goalId) ? prev.filter(id => id !== goalId) : [...prev, goalId]
        );
    }
    
    const handleOpenChange = (isOpen: boolean) => {
        setIsDialogOpen(isOpen);
        if (!isOpen) {
            form.reset();
            setGeneratedSchedule(null);
            setSelectedGoals([]);
        }
    }

    return (
        <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button variant="outline">
                    <Sparkles className="mr-2 h-4 w-4" /> AI Scheduler
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
                
                {generatedSchedule ? (
                    <ScheduleViewer 
                        schedule={generatedSchedule}
                        onApply={handleApplySchedule}
                        onSave={handleSaveTemplate}
                        onBack={() => setGeneratedSchedule(null)}
                    />
                ) : (
                    <>
                    <DialogHeader>
                        <DialogTitle className="font-headline">AI Schedule Generator</DialogTitle>
                        <DialogDescription>
                            Describe your ideal week, select goals to include, and let AI create a personalized plan for you.
                        </DialogDescription>
                    </DialogHeader>

                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(handleGenerateSchedule)} className="flex-grow flex flex-col overflow-hidden">
                            <ScrollArea className="flex-grow -mx-6 px-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 py-4 px-1">
                                    <div className="space-y-6">
                                        <FormField
                                            control={form.control} name="priorities"
                                            render={({ field }) => ( <FormItem><FormLabel>Priorities</FormLabel><FormControl><Textarea placeholder="e.g., Focus on work, with evenings for learning." {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField
                                            control={form.control} name="workHours"
                                            render={({ field }) => ( <FormItem><FormLabel>Work/Study Hours</FormLabel><FormControl><Input placeholder="e.g., 9 AM to 5 PM, Mon-Fri" {...field} /></FormControl><div className="flex flex-wrap gap-2 pt-1"><SuggestionButton onClick={() => form.setValue('workHours', '9 AM to 5 PM, Mon-Fri')}>9-5 Full-time</SuggestionButton><SuggestionButton onClick={() => form.setValue('workHours', 'Flexible, about 8 hours a day')}>Flexible Hours</SuggestionButton></div><FormMessage /></FormItem>)} />
                                        <FormField
                                            control={form.control} name="habits"
                                            render={({ field }) => ( <FormItem><FormLabel>Habits</FormLabel><FormControl><Input placeholder="e.g., Gym 3x a week, read 30 mins daily" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField
                                            control={form.control} name="commitments"
                                            render={({ field }) => ( <FormItem><FormLabel>Fixed Commitments</FormLabel><FormControl><Input placeholder="e.g., Team meeting Mon 10am" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField
                                            control={form.control} name="sleepHours"
                                            render={({ field }) => ( <FormItem><FormLabel>Desired Sleep Hours</FormLabel><FormControl><Input placeholder="e.g., 11 PM to 7 AM" {...field} /></FormControl><div className="flex flex-wrap gap-2 pt-1"><SuggestionButton onClick={() => form.setValue('sleepHours', '10 PM to 6 AM')}>10 PM - 6 AM</SuggestionButton><SuggestionButton onClick={() => form.setValue('sleepHours', '11 PM to 7 AM')}>11 PM - 7 AM</SuggestionButton></div><FormMessage /></FormItem>)} />
                                        <FormField
                                            control={form.control} name="mealHours"
                                            render={({ field }) => ( <FormItem><FormLabel>Meal Times</FormLabel><FormControl><Input placeholder="e.g., Lunch at 1pm, dinner at 7pm" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField
                                            control={form.control} name="restHours"
                                            render={({ field }) => ( <FormItem><FormLabel>Rest & Leisure</FormLabel><FormControl><Input placeholder="e.g., Short breaks during work, weekends free" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    </div>
                                    <div className="flex flex-col overflow-hidden">
                                         <FormLabel>Goals to Include (Optional)</FormLabel>
                                         <p className="text-xs text-muted-foreground mb-2">Select goals to include in the schedule generation.</p>
                                         <div className="flex-1 min-h-0 border rounded-md">
                                            <ScrollArea className="h-full">
                                                <div className="p-2 space-y-1">
                                                    {allGoals.length === 0 && (<div className="text-center text-muted-foreground p-4 text-sm">No goals found.</div>)}
                                                    {allGoals.map(goal => (
                                                        <div key={goal.id} className="flex items-center space-x-3 p-2 rounded-md hover:bg-muted/50">
                                                            <Checkbox id={`gen-goal-${goal.id}`} checked={selectedGoals.includes(goal.id)} onCheckedChange={() => handleGoalToggle(goal.id)} />
                                                            <label htmlFor={`gen-goal-${goal.id}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-grow">{goal.title}</label>
                                                        </div>
                                                    ))}
                                                </div>
                                            </ScrollArea>
                                         </div>
                                         <div className="text-xs text-muted-foreground mt-2 flex-shrink-0">Selected goals: {selectedGoals.length}</div>
                                    </div>
                                </div>
                            </ScrollArea>
                            <DialogFooter className="pt-4 flex-shrink-0 border-t -mx-6 px-6">
                                <Button type="submit" disabled={isGeneratingSchedule} className="w-full sm:w-auto">
                                    {isGeneratingSchedule ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                                    Generate Schedule
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </>
                )}
            </DialogContent>
        </Dialog>
    );
}
