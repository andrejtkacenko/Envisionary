
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
import { RadioGroup, RadioGroupItem } from './ui/radio-group';

interface ScheduleGeneratorProps {
    children: React.ReactNode;
    onScheduleGenerated: (schedule: DailySchedule[]) => void;
    allGoals: Goal[];
}

const generatorSchema = z.object({
  workHours: z.string().min(1, "Please select your work hours."),
  sleepHours: z.string().min(1, "Please select your sleep hours."),
  training: z.string().min(1, "Please select your training habits."),
  meditation: z.string().min(1, "Please select your meditation habits."),
  other: z.string().optional(),
});
type GeneratorFormValues = z.infer<typeof generatorSchema>;

export function ScheduleGenerator({ children, onScheduleGenerated, allGoals }: ScheduleGeneratorProps) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [isGenerating, setIsGenerating] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedGoals, setSelectedGoals] = useState<string[]>([]);

    const form = useForm<GeneratorFormValues>({
        resolver: zodResolver(generatorSchema),
        defaultValues: { 
            workHours: "9 AM to 5 PM, Mon-Fri",
            sleepHours: "11 PM to 7 AM",
            training: "3 times a week",
            meditation: "10 minutes daily",
            other: ""
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
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 py-4">
                            {/* Left column for preferences */}
                            <div className="space-y-4">
                                <h4 className="text-sm font-semibold text-muted-foreground">Your Lifestyle Preferences</h4>
                               <div className="grid grid-cols-1 gap-6">
                                    <FormField
                                        control={form.control}
                                        name="workHours"
                                        render={({ field }) => (
                                            <FormItem className="space-y-3">
                                                <FormLabel>Work/Study Hours</FormLabel>
                                                <FormControl>
                                                    <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-col space-y-1">
                                                        <FormItem className="flex items-center space-x-3 space-y-0">
                                                            <FormControl><RadioGroupItem value="9 AM to 5 PM, Mon-Fri" /></FormControl>
                                                            <FormLabel className="font-normal">Full-time (9 AM - 5 PM)</FormLabel>
                                                        </FormItem>
                                                        <FormItem className="flex items-center space-x-3 space-y-0">
                                                            <FormControl><RadioGroupItem value="Flexible, about 8 hours a day" /></FormControl>
                                                            <FormLabel className="font-normal">Flexible Hours</FormLabel>
                                                        </FormItem>
                                                         <FormItem className="flex items-center space-x-3 space-y-0">
                                                            <FormControl><RadioGroupItem value="Part-time, 4 hours a day" /></FormControl>
                                                            <FormLabel className="font-normal">Part-time (4 hours/day)</FormLabel>
                                                        </FormItem>
                                                    </RadioGroup>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="sleepHours"
                                        render={({ field }) => (
                                            <FormItem className="space-y-3">
                                                <FormLabel>Sleep Schedule</FormLabel>
                                                <FormControl>
                                                    <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-col space-y-1">
                                                        <FormItem className="flex items-center space-x-3 space-y-0">
                                                            <FormControl><RadioGroupItem value="10 PM to 6 AM" /></FormControl>
                                                            <FormLabel className="font-normal">10 PM - 6 AM</FormLabel>
                                                        </FormItem>
                                                        <FormItem className="flex items-center space-x-3 space-y-0">
                                                            <FormControl><RadioGroupItem value="11 PM to 7 AM" /></FormControl>
                                                            <FormLabel className="font-normal">11 PM - 7 AM</FormLabel>
                                                        </FormItem>
                                                        <FormItem className="flex items-center space-x-3 space-y-0">
                                                            <FormControl><RadioGroupItem value="12 AM to 8 AM" /></FormControl>
                                                            <FormLabel className="font-normal">12 AM - 8 AM</FormLabel>
                                                        </FormItem>
                                                    </RadioGroup>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                     <FormField
                                        control={form.control}
                                        name="training"
                                        render={({ field }) => (
                                            <FormItem className="space-y-3">
                                                <FormLabel>Training / Exercise</FormLabel>
                                                <FormControl>
                                                    <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-col space-y-1">
                                                         <FormItem className="flex items-center space-x-3 space-y-0">
                                                            <FormControl><RadioGroupItem value="3 times a week" /></FormControl>
                                                            <FormLabel className="font-normal">3 times a week</FormLabel>
                                                        </FormItem>
                                                        <FormItem className="flex items-center space-x-3 space-y-0">
                                                            <FormControl><RadioGroupItem value="5 times a week" /></FormControl>
                                                            <FormLabel className="font-normal">5 times a week</FormLabel>
                                                        </FormItem>
                                                        <FormItem className="flex items-center space-x-3 space-y-0">
                                                            <FormControl><RadioGroupItem value="Daily light exercise" /></FormControl>
                                                            <FormLabel className="font-normal">Daily light exercise</FormLabel>
                                                        </FormItem>
                                                    </RadioGroup>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                     <FormField
                                        control={form.control}
                                        name="meditation"
                                        render={({ field }) => (
                                            <FormItem className="space-y-3">
                                                <FormLabel>Meditation / Mindfulness</FormLabel>
                                                <FormControl>
                                                    <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-col space-y-1">
                                                        <FormItem className="flex items-center space-x-3 space-y-0">
                                                            <FormControl><RadioGroupItem value="None" /></FormControl>
                                                            <FormLabel className="font-normal">None</FormLabel>
                                                        </FormItem>
                                                        <FormItem className="flex items-center space-x-3 space-y-0">
                                                            <FormControl><RadioGroupItem value="10 minutes daily" /></FormControl>
                                                            <FormLabel className="font-normal">10 minutes daily</FormLabel>
                                                        </FormItem>
                                                        <FormItem className="flex items-center space-x-3 space-y-0">
                                                            <FormControl><RadioGroupItem value="20 minutes daily" /></FormControl>
                                                            <FormLabel className="font-normal">20 minutes daily</FormLabel>
                                                        </FormItem>
                                                    </RadioGroup>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                     <FormField
                                        control={form.control}
                                        name="other"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Other Constraints or Notes</FormLabel>
                                                <FormControl><Textarea placeholder="e.g., I have a long commute, Lunch breaks are flexible" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                               </div>
                            </div>
                            
                            {/* Right column for goal selection */}
                            <div>
                                 <h4 className="text-sm font-semibold text-muted-foreground">Goals to Include (Optional)</h4>
                                 <p className="text-xs text-muted-foreground mb-2">Select goals to include in the schedule generation.</p>
                                 <ScrollArea className="h-96 mt-2 border rounded-md">
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

    