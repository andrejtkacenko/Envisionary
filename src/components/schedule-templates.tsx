
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, Sparkles, Plus, Trash2, Wand2, FileText, Calendar, Check, ListTodo } from 'lucide-react';

import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { generateScheduleTemplate } from '@/ai/flows/generate-schedule-template';
import { getScheduleTemplates, addScheduleTemplate, deleteScheduleTemplate } from '@/lib/goals-service';
import type { ScheduleTemplate, DailySchedule, Goal } from '@/types';
import { Badge } from './ui/badge';
import { Checkbox } from './ui/checkbox';


interface ScheduleTemplatesProps {
    onApplyTemplate: (schedule: DailySchedule[]) => void;
    allGoals: Goal[];
}

const createTemplateSchema = z.object({
  name: z.string().min(3, "Template name must be at least 3 characters."),
  description: z.string().min(5, "Description is required to give context to the AI."),
  type: z.enum(['day', 'week']),
});
type CreateTemplateFormValues = z.infer<typeof createTemplateSchema>;

export function ScheduleTemplates({ onApplyTemplate, allGoals }: ScheduleTemplatesProps) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [templates, setTemplates] = useState<ScheduleTemplate[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [selectedGoals, setSelectedGoals] = useState<string[]>([]);

    const form = useForm<CreateTemplateFormValues>({
        resolver: zodResolver(createTemplateSchema),
        defaultValues: { name: "", description: "", type: 'week' },
    });

    const fetchTemplates = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const userTemplates = await getScheduleTemplates(user.uid);
            setTemplates(userTemplates);
        } catch (error) {
            console.error("Failed to fetch templates", error);
            toast({ variant: 'destructive', title: 'Could not load templates.' });
        } finally {
            setIsLoading(false);
        }
    }, [user, toast]);

    useEffect(() => {
        if(user) fetchTemplates();
    }, [fetchTemplates, user]);

    const handleCreateTemplate = async (values: CreateTemplateFormValues) => {
        if (!user) return;
        setIsGenerating(true);
        
        const goalsToInclude = allGoals.filter(g => selectedGoals.includes(g.id)).map(g => ({
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
            form.reset();
            setSelectedGoals([]);
            setIsCreateDialogOpen(false);
            fetchTemplates(); // Refresh the list
        } catch (error) {
             console.error("Failed to create template", error);
             toast({ variant: 'destructive', title: 'Creation failed', description: 'An error occurred while creating the template.' });
        } finally {
            setIsGenerating(false);
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

    const handleGoalToggle = (goalId: string) => {
        setSelectedGoals(prev => 
            prev.includes(goalId) ? prev.filter(id => id !== goalId) : [...prev, goalId]
        );
    }


    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Schedule Templates</CardTitle>
                    <CardDescription>Create and apply schedule templates.</CardDescription>
                </div>
                 <Dialog open={isCreateDialogOpen} onOpenChange={(isOpen) => {
                     setIsCreateDialogOpen(isOpen);
                     if (!isOpen) {
                         form.reset();
                         setSelectedGoals([]);
                     }
                 }}>
                    <DialogTrigger asChild>
                        <Button size="sm">
                            <Plus className="mr-2 h-4 w-4" /> New
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-2xl">
                        <DialogHeader>
                            <DialogTitle className="font-headline flex items-center gap-2"><Wand2 /> Create AI Schedule Template</DialogTitle>
                            <DialogDescription>
                                Describe the kind of schedule you want, select goals to include, and the AI will generate a template for you.
                            </DialogDescription>
                        </DialogHeader>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(handleCreateTemplate)} className="space-y-4 py-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <FormField
                                            control={form.control}
                                            name="name"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Template Name</FormLabel>
                                                    <FormControl><Input placeholder="e.g., My Productive Week" {...field} /></FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="description"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Description</FormLabel>
                                                    <FormControl><Textarea placeholder="e.g., A 9-5 work schedule with morning workouts and evening study sessions." {...field} /></FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="type"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Template Type</FormLabel>
                                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="week">Full Week</SelectItem>
                                                            <SelectItem value="day">Single Day</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                    <div>
                                         <FormLabel>Attach Goals (Optional)</FormLabel>
                                         <p className="text-xs text-muted-foreground mb-2">Select goals to include in the schedule generation.</p>
                                         <ScrollArea className="h-64 mt-2 border rounded-md">
                                            <div className="p-2 space-y-1">
                                                {allGoals.length === 0 && (
                                                    <div className="text-center text-muted-foreground p-4 text-sm">No goals to attach.</div>
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
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button type="submit" disabled={isGenerating}>
                                        {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                                        Generate & Save
                                    </Button>
                                </DialogFooter>
                            </form>
                        </Form>
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                     <div className="flex items-center justify-center h-60">
                        <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                ) : (
                    <ScrollArea className="h-auto min-h-[450px] max-h-[500px]">
                        <div className="pr-4 space-y-3">
                             {templates.length === 0 && (
                                <div className="text-center text-muted-foreground py-20">
                                    <p>No templates found.</p>
                                    <p className="text-sm">Click "New" to create one.</p>
                                </div>
                             )}
                            {templates.map(template => (
                                <Card key={template.id}>
                                    <CardContent className="p-3 flex items-center justify-between">
                                        <div className="flex-grow">
                                            <p className="font-semibold">{template.name}</p>
                                            <Badge variant="outline" className="mt-1 capitalize">
                                                {template.type === 'week' ? <Calendar className="mr-1.5 h-3 w-3" /> : <FileText className="mr-1.5 h-3 w-3" />}
                                                {template.type}
                                            </Badge>
                                        </div>
                                        <div className="flex gap-1">
                                            <Button size="sm" variant="secondary" onClick={() => onApplyTemplate(template.data)}>Apply</Button>
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
    );
}
