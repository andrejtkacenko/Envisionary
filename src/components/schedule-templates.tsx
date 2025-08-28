
"use client";

import { useState, useEffect, useCallback } from 'react';
import { Loader2, Inbox, Trash2 } from 'lucide-react';
import type { ScheduleTemplate } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { deleteScheduleTemplate } from '@/lib/goals-service';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { formatDistanceToNow } from 'date-fns';
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
import { ScrollArea } from './ui/scroll-area';

interface ScheduleTemplatesProps {
    onApplyTemplate: (templateData: any) => void;
    templates: ScheduleTemplate[];
    fetchTemplates: () => void;
}

export function ScheduleTemplates({ onApplyTemplate, templates, fetchTemplates }: ScheduleTemplatesProps) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Initial fetch is now handled by the parent component (TaskActions)
        // This just sets the loading state based on the initial prop
        setIsLoading(templates.length === 0);
        if(templates.length > 0) setIsLoading(false);
    }, [templates]);


    const handleDelete = async (templateId: string) => {
        if (!user) return;
        try {
            await deleteScheduleTemplate(user.uid, templateId);
            toast({ title: "Template deleted successfully." });
            fetchTemplates(); // Re-fetch to update the list
        } catch (error) {
             console.error(error);
            toast({ variant: 'destructive', title: 'Failed to delete template.' });
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-full">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    if (templates.length === 0) {
        return (
            <div className="text-center text-muted-foreground py-16">
                <Inbox className="mx-auto h-12 w-12" />
                <p className="mt-4">You haven&apos;t saved any schedule templates yet.</p>
                <p className="text-sm">Generate a schedule and save it as a template to reuse it later.</p>
            </div>
        );
    }

    return (
        <ScrollArea className="h-full">
            <div className="space-y-3 pr-4">
                {templates.map(template => (
                    <Card key={template.id}>
                        <CardContent className="p-4 flex justify-between items-center">
                            <div>
                                <p className="font-semibold">{template.name}</p>
                                <p className="text-sm text-muted-foreground">
                                    Saved {formatDistanceToNow(template.createdAt.toDate(), { addSuffix: true })}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="destructive" size="sm">
                                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                            <AlertDialogDescription>This action cannot be undone. This will permanently delete the template.</AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleDelete(template.id)}>Continue</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                                <Button onClick={() => onApplyTemplate(template.data)} size="sm">
                                    Apply
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </ScrollArea>
    );
}

