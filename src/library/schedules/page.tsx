

"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, PlusCircle, Trash2, Clock, CalendarDays, Play } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { getScheduleTemplates, deleteScheduleTemplate } from '@/lib/goals-service';
import type { ScheduleTemplate, DailySchedule, Task } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { format, setHours, setMinutes } from 'date-fns';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useTaskStore } from '@/hooks/use-task-store';


const ScheduleTemplateCard = ({ template, onDelete, onApply }: { template: ScheduleTemplate, onDelete: (id: string) => void, onApply: (template: ScheduleTemplate) => void }) => {
    return (
        <Card className="flex flex-col">
            <CardHeader>
                <CardTitle className="font-headline text-xl">{template.name}</CardTitle>
                <CardDescription>Created on {new Date(template.createdAt).toLocaleDateString()}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
                 <p className="text-sm font-medium text-muted-foreground">
                    Plan for {template.schedule.length} days.
                </p>
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
                 <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="icon"><Trash2 className="h-4 w-4"/></Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>This will permanently delete the schedule template. This action cannot be undone.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => onDelete(template.id)}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                 </AlertDialog>

                <Dialog>
                    <DialogTrigger asChild><Button variant="outline">View</Button></DialogTrigger>
                    <DialogContent className="max-w-2xl">
                         <DialogHeader>
                            <DialogTitle className="font-headline text-xl">{template.name}</DialogTitle>
                         </DialogHeader>
                         <ScrollArea className="h-[60vh] p-1">
                             {template.schedule.map(day => (
                                <div key={day.date} className="mb-4">
                                    <h3 className="font-bold text-lg mb-2 border-b pb-1">{format(new Date(day.date + 'T00:00:00'), "eeee, MMMM do")}</h3>
                                    <div className="space-y-2">
                                        {day.items.map((item, index) => (
                                            <div key={index} className="flex items-center gap-4 p-2 rounded-md bg-muted/50">
                                                <div className="font-mono text-sm bg-background p-1 rounded">{item.startTime}</div>
                                                <div className="flex-grow">
                                                    <p className="font-medium">{item.title}</p>
                                                </div>
                                                <Badge variant="outline">{item.duration} min</Badge>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                         </ScrollArea>
                    </DialogContent>
                </Dialog>
                <Button onClick={() => onApply(template)}>
                    <Play className="mr-2 h-4 w-4"/>
                    Apply
                </Button>
            </CardFooter>
        </Card>
    )
};


export default function ScheduleLibraryPage() {
  const [templates, setTemplates] = useState<ScheduleTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { appUser } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const { tasks: allTasks, updateTasks, addTask } = useTaskStore();

  const fetchTemplates = async () => {
      if (!appUser) return;
      setIsLoading(true);
      try {
        const fetchedTemplates = await getScheduleTemplates(appUser.id);
        setTemplates(fetchedTemplates);
      } catch (error) {
        console.error("Failed to fetch schedule templates:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Could not load schedule templates.",
        });
      } finally {
        setIsLoading(false);
      }
  }

  useEffect(() => {
    if (appUser) {
        fetchTemplates();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appUser]);

  const handleDelete = async (templateId: string) => {
    if (!appUser) return;
    try {
        await deleteScheduleTemplate(templateId);
        setTemplates(prev => prev.filter(t => t.id !== templateId));
        toast({ title: "Template Deleted" });
    } catch(e) {
        toast({ variant: "destructive", title: "Error", description: "Could not delete template." });
    }
  }
  
  const handleApplyTemplate = async (template: ScheduleTemplate) => {
    if (!appUser) return;

    const tasksToUpdate: Task[] = [];
    const tasksToCreate: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>[] = [];
    const unscheduledTasksCopy = [...allTasks.filter(t => !t.dueDate)];

    try {
        for (const day of template.schedule) {
            for (const item of day.items) {
                const scheduledDate = new Date(day.date + 'T00:00:00');
                const [hours, minutes] = item.startTime.split(':').map(Number);
                const taskDate = setMinutes(setHours(scheduledDate, hours), minutes);

                if (unscheduledTasksCopy.length > 0) {
                     // Prioritize filling slots with existing tasks
                    const taskToSchedule = unscheduledTasksCopy.shift()!;
                    tasksToUpdate.push({
                        ...taskToSchedule,
                        dueDate: taskDate,
                        time: item.startTime,
                        duration: item.duration,
                    });
                } else {
                    // If no more user tasks, create the AI-suggested ones
                    tasksToCreate.push({
                        userId: appUser.id,
                        title: item.title,
                        priority: 'p4',
                        isCompleted: false,
                        dueDate: taskDate,
                        time: item.startTime,
                        duration: item.duration,
                    });
                }
            }
        }
        
        const totalScheduled = tasksToUpdate.length + tasksToCreate.length;
        if (totalScheduled === 0) {
            toast({ title: "No tasks to schedule", description: "Your inbox is empty or the template has no slots."});
            return;
        }

        if (tasksToUpdate.length > 0) {
            await updateTasks(tasksToUpdate);
        }
        if (tasksToCreate.length > 0) {
            await Promise.all(tasksToCreate.map(t => addTask(t)));
        }

        toast({ title: "Schedule Applied!", description: `${totalScheduled} tasks have been scheduled.` });
        router.push('/tasks');

    } catch (e) {
        console.error(e);
        toast({ variant: 'destructive', title: 'Failed to apply schedule' });
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground mt-4">Loading Schedule Templates...</p>

      </div>
    );
  }

  return (
    <div className="space-y-8">
        {templates.length === 0 ? (
            <div className="text-center text-muted-foreground py-12 border rounded-lg bg-card/50">
                <CalendarDays className="mx-auto h-12 w-12" />
                <p className="mt-4 text-lg">No Schedule Templates Yet</p>
                <p className="text-sm">Generate a schedule with the AI Scheduler and save it as a template.</p>
            </div>
        ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {templates.map(template => (
                    <ScheduleTemplateCard key={template.id} template={template} onDelete={handleDelete} onApply={handleApplyTemplate} />
                ))}
            </div>
        )}
    </div>
  );
}
