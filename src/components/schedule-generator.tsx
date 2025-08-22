
"use client";

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, Sparkles, Check } from 'lucide-react';

import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { generateSchedule } from '@/ai/flows/generate-schedule';
import type { DailySchedule, Goal } from '@/types';
import { cn } from '@/lib/utils';

interface ScheduleGeneratorProps {
    children: React.ReactNode;
    onScheduleGenerated: (schedule: DailySchedule[]) => void;
    allGoals: Goal[];
}

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

const SuggestionButton = ({ children, onClick }: { children: React.ReactNode, onClick: () => void}) => (
    <Button type="button" variant="outline" size="sm" className="text-xs h-auto py-1 px-2" onClick={onClick}>
        {children}
    </Button>
);


export function ScheduleGenerator({ children, onScheduleGenerated, allGoals }: ScheduleGeneratorProps) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [isGenerating, setIsGenerating] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedGoals, setSelectedGoals] = useState<string[]>([]);

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
    
    const handleGenerate = async (values: GeneratorFormValues) => {
        if (!user) return;
        setIsGenerating(true);
        
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
                return;
            }
            
            onScheduleGenerated(weeklySchedule);
            setIsDialogOpen(false); // Close dialog on success
        } catch (error) {
             console.error("Failed to generate schedule", error);
             toast({ variant: 'destructive', title: 'Generation failed', description: 'An error occurred while creating the schedule.' });
        } finally {
            setIsGenerating(false);
        }
    };
    
    const handleGoalToggle = (goalId: string) => {
        setSelectedGoals(prev => 
            prev.includes(goalId) ? prev.filter(id => id !== goalId) : [...prev, goalId]
        );
    }
    
    const handleOpenChange = (isOpen: boolean) => {
        setIsDialogOpen(isOpen);
        if (!isOpen) {
            form.reset();
            setSelectedGoals([]);
        }
    }


    return (
        <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="sm:max-w-4xl">
                <DialogHeader>
                    <DialogTitle className="font-headline">Generate AI Schedule</DialogTitle>
                    <DialogDescription>
                        Answer a few questions about your lifestyle and select goals to include. The AI will create a personalized weekly schedule for you.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleGenerate)}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 py-4">
                            {/* Left column for preferences */}
                            <ScrollArea className="h-96 pr-4">
                            <div className="space-y-6">
                                <FormField
                                    control={form.control}
                                    name="priorities"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Priorities</FormLabel>
                                            <FormControl><Textarea placeholder="e.g., Focus on work, with evenings for learning." {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="workHours"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Work/Study Hours</FormLabel>
                                            <FormControl><Input placeholder="e.g., 9 AM to 5 PM, Mon-Fri" {...field} /></FormControl>
                                            <div className="flex flex-wrap gap-2 pt-1">
                                                <SuggestionButton onClick={() => form.setValue('workHours', '9 AM to 5 PM, Mon-Fri')}>9-5 Full-time</SuggestionButton>
                                                <SuggestionButton onClick={() => form.setValue('workHours', 'Flexible, about 8 hours a day')}>Flexible Hours</SuggestionButton>
                                            </div>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="habits"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Habits</FormLabel>
                                            <FormControl><Input placeholder="e.g., Gym 3x a week, read 30 mins daily" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="commitments"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Fixed Commitments</FormLabel>
                                            <FormControl><Input placeholder="e.g., Team meeting Mon 10am" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="sleepHours"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Desired Sleep Hours</FormLabel>
                                            <FormControl><Input placeholder="e.g., 11 PM to 7 AM" {...field} /></FormControl>
                                             <div className="flex flex-wrap gap-2 pt-1">
                                                <SuggestionButton onClick={() => form.setValue('sleepHours', '10 PM to 6 AM')}>10 PM - 6 AM</SuggestionButton>
                                                <SuggestionButton onClick={() => form.setValue('sleepHours', '11 PM to 7 AM')}>11 PM - 7 AM</SuggestionButton>
                                            </div>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="mealHours"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Meal Times</FormLabel>
                                            <FormControl><Input placeholder="e.g., Lunch at 1pm, dinner at 7pm" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="restHours"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Rest & Leisure</FormLabel>
                                            <FormControl><Input placeholder="e.g., Short breaks during work, weekends free" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            </ScrollArea>
                            
                            {/* Right column for goal selection */}
                            <div>
                                 <h4 className="text-base font-semibold text-muted-foreground">Goals to Include (Optional)</h4>
                                 <p className="text-xs text-muted-foreground mb-2">Select goals to include in the schedule generation.</p>
                                 <ScrollArea className="h-96 mt-4 border rounded-md">
                                    <div className="p-2 space-y-1">
                                        {allGoals.length === 0 && (
                                            <div className="text-center text-muted-foreground p-4 text-sm">No goals found.</div>
                                        )}
                                        {allGoals.map(goal => (
                                            <div key={goal.id} className="flex items-center space-x-3 p-2 rounded-md hover:bg-muted/50">
                                                <Checkbox 
                                                    id={`goal-${goal.id}`} 
                                                    checked={selectedGoals.includes(goal.id)}
                                                    onCheckedChange={() => handleGoalToggle(goal.id)}
                                                />
                                                <label htmlFor={`goal-${goal.id}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-grow">
                                                    {goal.title}
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                 </ScrollArea>
                                 <div className="text-xs text-muted-foreground mt-2">
                                    Selected goals: {selectedGoals.length}
                                 </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="submit" disabled={isGenerating} className="w-full sm:w-auto">
                                {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                                Generate Schedule
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
