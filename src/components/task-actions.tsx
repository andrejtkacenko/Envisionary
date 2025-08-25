
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, Sparkles, Plus, Trash2, Wand2, FileText, Calendar } from 'lucide-react';

import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { generateSchedule } from '@/ai/flows/generate-schedule';
import { generateScheduleTemplate } from '@/ai/flows/generate-schedule-template';
import { getScheduleTemplates, addScheduleTemplate, deleteScheduleTemplate } from '@/lib/goals-service';
import type { ScheduleTemplate, DailySchedule, Goal } from '@/types';
import { Badge } from './ui/badge';
import { Checkbox } from './ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';

// --- PROPS ---
interface TaskActionsProps {
    onScheduleApplied: (schedule: DailySchedule[]) => void;
    allGoals: Goal[];
}

// --- GENERATOR SCHEMAS ---
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

// --- TEMPLATE SCHEMAS ---
const createTemplateSchema = z.object({
  name: z.string().min(3, "Template name must be at least 3 characters."),
  description: z.string().min(5, "Description is required to give context to the AI."),
  type: z.enum(['day', 'week']),
});
type CreateTemplateFormValues = z.infer<typeof createTemplateSchema>;


// --- HELPER COMPONENTS ---
const SuggestionButton = ({ children, onClick }: { children: React.ReactNode, onClick: () => void}) => (
    <Button type="button" variant="outline" size="sm" className="text-xs h-auto py-1 px-2" onClick={onClick}>
        {children}
    </Button>
);


// --- MAIN COMPONENT ---
export function TaskActions({ allGoals, onScheduleApplied }: TaskActionsProps) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    
    // Generator State
    const [isGeneratingSchedule, setIsGeneratingSchedule] = useState(false);
    const [selectedGoalsForGenerator, setSelectedGoalsForGenerator] = useState<string[]>([]);

    // Templates State
    const [templates, setTemplates] = useState<ScheduleTemplate[]>([]);
    const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
    const [isGeneratingTemplate, setIsGeneratingTemplate] = useState(false);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const [isCreateTemplateOpen, setIsCreateTemplateOpen] = useState(false);
    const [selectedGoalsForTemplate, setSelectedGoalsForTemplate] = useState<string[]>([]);
    
    // --- FORMS ---
    const generatorForm = useForm<GeneratorFormValues>({
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
    
    const templateForm = useForm<CreateTemplateFormValues>({
        resolver: zodResolver(createTemplateSchema),
        defaultValues: { name: "", description: "", type: 'week' },
    });

    // --- TEMPLATE LOGIC ---
    const fetchTemplates = useCallback(async () => {
        if (!user) return;
        setIsLoadingTemplates(true);
        try {
            const userTemplates = await getScheduleTemplates(user.uid);
            setTemplates(userTemplates);
        } catch (error) {
            console.error("Failed to fetch templates", error);
            toast({ variant: 'destructive', title: 'Could not load templates.' });
        } finally {
            setIsLoadingTemplates(false);
        }
    }, [user, toast]);

    useEffect(() => {
        if (user && isDialogOpen) {
            fetchTemplates();
        }
    }, [fetchTemplates, user, isDialogOpen]);

    const handleCreateTemplate = async (values: CreateTemplateFormValues) => {
        if (!user) return;
        setIsGeneratingTemplate(true);
        
        const goalsToInclude = allGoals.filter(g => selectedGoalsForTemplate.includes(g.id)).map(g => ({
            id: g.id,
            title: g.title,
            estimatedTime: g.estimatedTime,
        }));

        try {
            const { templateData } = await generateScheduleTemplate({
                description: values.description,
                type: values.type,
                goals: goalsToInclude,
            });

            if (!templateData || templateData.length === 0) {
                toast({ title: "Generation failed", description: "AI could not create a template. Try a different description."});
                return;
            }

            await addScheduleTemplate(user.uid, {
                name: values.name,
                type: values.type,
                data: templateData,
            });
            
            toast({ title: "Template Created!", description: `"${values.name}" has been saved.`});
            templateForm.reset();
            setSelectedGoalsForTemplate([]);
            setIsCreateTemplateOpen(false);
            fetchTemplates();
        } catch (error) {
             console.error("Failed to create template", error);
             toast({ variant: 'destructive', title: 'Creation failed', description: 'An error occurred while creating the template.' });
        } finally {
            setIsGeneratingTemplate(false);
        }
    };
    
    const handleDeleteTemplate = async (templateId: string) => {
        if (!user) return;
        setIsDeleting(templateId);
        try {
            await deleteScheduleTemplate(user.uid, templateId);
            toast({ title: "Template Deleted" });
            setTemplates(prev => prev.filter(t => t.id !== templateId));
        } catch (error) {
            console.error("Failed to delete template", error);
            toast({ variant: 'destructive', title: 'Deletion failed' });
        } finally {
            setIsDeleting(null);
        }
    };

    const handleApplyTemplate = (data: DailySchedule[]) => {
        onScheduleApplied(data);
        setIsDialogOpen(false);
    }
    
    const handleGoalToggleForTemplate = (goalId: string) => {
        setSelectedGoalsForTemplate(prev => 
            prev.includes(goalId) ? prev.filter(id => id !== goalId) : [...prev, goalId]
        );
    }
    
    // --- GENERATOR LOGIC ---
    const handleGenerateSchedule = async (values: GeneratorFormValues) => {
        if (!user) return;
        setIsGeneratingSchedule(true);
        
        const goalsToInclude = allGoals.filter(g => selectedGoalsForGenerator.includes(g.id)).map(g => ({
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
            
            onScheduleApplied(weeklySchedule);
            setIsDialogOpen(false);
        } catch (error) {
             console.error("Failed to generate schedule", error);
             toast({ variant: 'destructive', title: 'Generation failed', description: 'An error occurred while creating the schedule.' });
        } finally {
            setIsGeneratingSchedule(false);
        }
    };
    
    const handleGoalToggleForGenerator = (goalId: string) => {
        setSelectedGoalsForGenerator(prev => 
            prev.includes(goalId) ? prev.filter(id => id !== goalId) : [...prev, goalId]
        );
    }
    
    // --- DIALOG OPEN/CLOSE ---
    const handleOpenChange = (isOpen: boolean) => {
        setIsDialogOpen(isOpen);
        if (!isOpen) {
            generatorForm.reset();
            setSelectedGoalsForGenerator([]);
        }
    }

    return (
        <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button>
                    <Sparkles className="mr-2 h-4 w-4" /> AI Scheduler
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-4xl max-h-[90vh] h-auto flex flex-col">
                <DialogHeader className="flex-shrink-0">
                    <DialogTitle className="font-headline">AI Scheduler</DialogTitle>
                    <DialogDescription>
                         Use the generator for a custom plan, or apply a saved template.
                    </DialogDescription>
                </DialogHeader>

                 <Tabs defaultValue="generator" className="flex-grow flex flex-col overflow-hidden">
                    <TabsList className="grid w-full grid-cols-2 flex-shrink-0">
                        <TabsTrigger value="generator">Generator</TabsTrigger>
                        <TabsTrigger value="templates">Templates</TabsTrigger>
                    </TabsList>
                    
                    {/* --- GENERATOR TAB --- */}
                    <TabsContent value="generator" className="flex-grow flex flex-col overflow-hidden mt-4">
                        <Form {...generatorForm}>
                            <form onSubmit={generatorForm.handleSubmit(handleGenerateSchedule)} className="h-full flex flex-col overflow-hidden">
                                <ScrollArea className="flex-grow pr-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 py-4">
                                    <div className="space-y-6">
                                        <FormField
                                            control={generatorForm.control} name="priorities"
                                            render={({ field }) => ( <FormItem><FormLabel>Priorities</FormLabel><FormControl><Textarea placeholder="e.g., Focus on work, with evenings for learning." {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField
                                            control={generatorForm.control} name="workHours"
                                            render={({ field }) => ( <FormItem><FormLabel>Work/Study Hours</FormLabel><FormControl><Input placeholder="e.g., 9 AM to 5 PM, Mon-Fri" {...field} /></FormControl><div className="flex flex-wrap gap-2 pt-1"><SuggestionButton onClick={() => generatorForm.setValue('workHours', '9 AM to 5 PM, Mon-Fri')}>9-5 Full-time</SuggestionButton><SuggestionButton onClick={() => generatorForm.setValue('workHours', 'Flexible, about 8 hours a day')}>Flexible Hours</SuggestionButton></div><FormMessage /></FormItem>)} />
                                        <FormField
                                            control={generatorForm.control} name="habits"
                                            render={({ field }) => ( <FormItem><FormLabel>Habits</FormLabel><FormControl><Input placeholder="e.g., Gym 3x a week, read 30 mins daily" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField
                                            control={generatorForm.control} name="commitments"
                                            render={({ field }) => ( <FormItem><FormLabel>Fixed Commitments</FormLabel><FormControl><Input placeholder="e.g., Team meeting Mon 10am" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField
                                            control={generatorForm.control} name="sleepHours"
                                            render={({ field }) => ( <FormItem><FormLabel>Desired Sleep Hours</FormLabel><FormControl><Input placeholder="e.g., 11 PM to 7 AM" {...field} /></FormControl><div className="flex flex-wrap gap-2 pt-1"><SuggestionButton onClick={() => generatorForm.setValue('sleepHours', '10 PM to 6 AM')}>10 PM - 6 AM</SuggestionButton><SuggestionButton onClick={() => generatorForm.setValue('sleepHours', '11 PM to 7 AM')}>11 PM - 7 AM</SuggestionButton></div><FormMessage /></FormItem>)} />
                                        <FormField
                                            control={generatorForm.control} name="mealHours"
                                            render={({ field }) => ( <FormItem><FormLabel>Meal Times</FormLabel><FormControl><Input placeholder="e.g., Lunch at 1pm, dinner at 7pm" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField
                                            control={generatorForm.control} name="restHours"
                                            render={({ field }) => ( <FormItem><FormLabel>Rest & Leisure</FormLabel><FormControl><Input placeholder="e.g., Short breaks during work, weekends free" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    </div>
                                    <div className="flex flex-col overflow-hidden">
                                         <FormLabel>Goals to Include (Optional)</FormLabel>
                                         <p className="text-xs text-muted-foreground mb-2">Select goals to include in the schedule generation.</p>
                                         <ScrollArea className="flex-1 border rounded-md">
                                            <div className="p-2 space-y-1">
                                                {allGoals.length === 0 && (<div className="text-center text-muted-foreground p-4 text-sm">No goals found.</div>)}
                                                {allGoals.map(goal => (
                                                    <div key={goal.id} className="flex items-center space-x-3 p-2 rounded-md hover:bg-muted/50">
                                                        <Checkbox id={`gen-goal-${goal.id}`} checked={selectedGoalsForGenerator.includes(goal.id)} onCheckedChange={() => handleGoalToggleForGenerator(goal.id)} />
                                                        <label htmlFor={`gen-goal-${goal.id}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-grow">{goal.title}</label>
                                                    </div>
                                                ))}
                                            </div>
                                         </ScrollArea>
                                         <div className="text-xs text-muted-foreground mt-2 flex-shrink-0">Selected goals: {selectedGoalsForGenerator.length}</div>
                                    </div>
                                </div>
                                </ScrollArea>
                                <DialogFooter className="pt-4 flex-shrink-0">
                                    <Button type="submit" disabled={isGeneratingSchedule} className="w-full sm:w-auto">
                                        {isGeneratingSchedule ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                                        Generate Schedule
                                    </Button>
                                </DialogFooter>
                            </form>
                        </Form>
                    </TabsContent>

                    {/* --- TEMPLATES TAB --- */}
                    <TabsContent value="templates" className="flex-grow flex flex-col mt-4 overflow-hidden">
                       <Card className="h-full flex flex-col">
                           <CardHeader className="flex flex-row items-center justify-between flex-shrink-0">
                               <div>
                                    <CardTitle>Schedule Templates</CardTitle>
                                    <CardDescription>Create or apply reusable schedule templates.</CardDescription>
                               </div>
                                <Dialog open={isCreateTemplateOpen} onOpenChange={(isOpen) => { setIsCreateTemplateOpen(isOpen); if (!isOpen) { templateForm.reset(); setSelectedGoalsForTemplate([]); }}}>
                                    <DialogTrigger asChild><Button size="sm"><Plus className="mr-2 h-4 w-4" /> New</Button></DialogTrigger>
                                    <DialogContent className="sm:max-w-2xl">
                                        <DialogHeader>
                                            <DialogTitle className="font-headline flex items-center gap-2"><Wand2 /> Create AI Schedule Template</DialogTitle>
                                            <DialogDescription>Describe the kind of schedule you want, select goals, and the AI will generate a template.</DialogDescription>
                                        </DialogHeader>
                                        <Form {...templateForm}>
                                            <form onSubmit={templateForm.handleSubmit(handleCreateTemplate)} className="space-y-4 py-4">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    <div className="space-y-4">
                                                        <FormField control={templateForm.control} name="name" render={({ field }) => (<FormItem><FormLabel>Template Name</FormLabel><FormControl><Input placeholder="e.g., My Productive Week" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                                        <FormField control={templateForm.control} name="description" render={({ field }) => (<FormItem><FormLabel>Description</FormLabel><FormControl><Textarea placeholder="e.g., A 9-5 work schedule with morning workouts..." {...field} /></FormControl><FormMessage /></FormItem>)} />
                                                        <FormField control={templateForm.control} name="type" render={({ field }) => (<FormItem><FormLabel>Template Type</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="week">Full Week</SelectItem><SelectItem value="day">Single Day</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                                                    </div>
                                                    <div className="flex flex-col overflow-hidden">
                                                         <FormLabel>Attach Goals (Optional)</FormLabel>
                                                         <p className="text-xs text-muted-foreground mb-2">Select goals to include in the generation.</p>
                                                         <ScrollArea className="h-64 mt-2 border rounded-md">
                                                            <div className="p-2 space-y-1">
                                                                {allGoals.length === 0 && (<div className="text-center text-muted-foreground p-4 text-sm">No goals to attach.</div>)}
                                                                {allGoals.map(goal => (
                                                                    <div key={goal.id} className="flex items-center space-x-3 p-2 rounded-md hover:bg-muted/50">
                                                                        <Checkbox id={`temp-goal-${goal.id}`} checked={selectedGoalsForTemplate.includes(goal.id)} onCheckedChange={() => handleGoalToggleForTemplate(goal.id)} />
                                                                        <label htmlFor={`temp-goal-${goal.id}`} className="text-sm font-medium leading-none flex-grow">{goal.title}</label>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                         </ScrollArea>
                                                    </div>
                                                </div>
                                                <DialogFooter>
                                                    <Button type="submit" disabled={isGeneratingTemplate}>
                                                        {isGeneratingTemplate ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                                                        Generate & Save
                                                    </Button>
                                                </DialogFooter>
                                            </form>
                                        </Form>
                                    </DialogContent>
                                </Dialog>
                           </CardHeader>
                            <CardContent className="flex-grow overflow-hidden">
                                {isLoadingTemplates ? (
                                     <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>
                                ) : (
                                    <ScrollArea className="h-full">
                                        <div className="pr-4 space-y-3">
                                             {templates.length === 0 && (
                                                <div className="text-center text-muted-foreground py-20"><p>No templates found.</p><p className="text-sm">Click "New" to create one.</p></div>
                                             )}
                                            {templates.map(template => (
                                                <Card key={template.id}>
                                                    <CardContent className="p-3 flex items-center justify-between">
                                                        <div className="flex-grow">
                                                            <p className="font-semibold">{template.name}</p>
                                                            <Badge variant="outline" className="mt-1 capitalize">{template.type === 'week' ? <Calendar className="mr-1.5 h-3 w-3" /> : <FileText className="mr-1.5 h-3 w-3" />}{template.type}</Badge>
                                                        </div>
                                                        <div className="flex gap-1">
                                                            <Button size="sm" variant="secondary" onClick={() => handleApplyTemplate(template.data)}>Apply</Button>
                                                            <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => handleDeleteTemplate(template.id)} disabled={isDeleting === template.id}>
                                                                {isDeleting === template.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                                            </Button>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                )}
                            </CardContent>
                       </Card>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}

    