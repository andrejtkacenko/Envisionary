
"use client";

import { useState, useEffect } from 'react';
import { Loader2, Trash2, CalendarPlus, Inbox } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { getScheduleTemplates, deleteScheduleTemplate } from '@/lib/goals-service';
import type { ScheduleTemplate, DailySchedule } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from './ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ScheduleTemplatesProps {
    onApplyTemplate: (schedule: DailySchedule[]) => void;
    needsRefresh: boolean;
    onRefreshComplete: () => void;
}

export function ScheduleTemplates({ onApplyTemplate, needsRefresh, onRefreshComplete }: ScheduleTemplatesProps) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [templates, setTemplates] = useState<ScheduleTemplate[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchTemplates = async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const fetchedTemplates = await getScheduleTemplates(user.uid);
            setTemplates(fetchedTemplates);
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Could not load templates.' });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchTemplates();
    }, [user]);
    
    useEffect(() => {
        if (needsRefresh) {
            fetchTemplates();
            onRefreshComplete();
        }
    }, [needsRefresh, onRefreshComplete]);


    const handleDelete = async (templateId: string) => {
        if (!user) return;
        try {
            await deleteScheduleTemplate(user.uid, templateId);
            setTemplates(prev => prev.filter(t => t.id !== templateId));
            toast({ title: "Template deleted." });
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Could not delete template.' });
        }
    }

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p>Loading templates...</p>
            </div>
        );
    }
    
    if (templates.length === 0) {
        return (
             <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground text-center">
                <Inbox className="h-12 w-12" />
                <h3 className="font-semibold">No templates found.</h3>
                <p className="text-sm">Save a generated schedule to use it as a template later.</p>
            </div>
        );
    }

    return (
        <ScrollArea className="h-full">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pr-4">
                {templates.map(template => (
                    <Card key={template.id} className="flex flex-col">
                        <CardHeader>
                            <CardTitle>{template.name}</CardTitle>
                             <CardDescription>A {template.type} schedule template.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-grow">
                           
                        </CardContent>
                        <CardFooter className="flex justify-between">
                             <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive" size="sm"><Trash2 className="h-4 w-4"/></Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This will permanently delete the template "{template.name}".
                                    </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDelete(template.id)}>Delete</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                            <Button size="sm" onClick={() => onApplyTemplate(template.data)}>
                                <CalendarPlus className="mr-2 h-4 w-4" /> Apply Template
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>
        </ScrollArea>
    );
}
