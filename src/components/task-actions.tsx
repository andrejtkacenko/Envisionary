

"use client";

import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Wand2, Loader2, Sparkles, Plus, Clock, ArrowRight, ArrowLeft, Save, Trash2, Play, BookCopy, CalendarDays } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from '@/hooks/use-toast';
import { Task, DailySchedule, ScheduleTemplate, ScheduledItem } from '@/types';
import { generateSchedule } from '@/ai/tools/schedule-actions';
import { getScheduleTemplates, deleteScheduleTemplate, addScheduleTemplate } from '@/lib/goals-service';
import { useTaskStore } from '@/hooks/use-task-store';
import { ScrollArea } from './ui/scroll-area';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { format, setHours, setMinutes, startOfWeek, endOfWeek, addDays, parse } from 'date-fns';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Textarea } from './ui/textarea';
import { Separator } from './ui/separator';
import { useAuth } from '@/context/AuthContext';
import { Card, CardFooter, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useRouter } from 'next/navigation';

interface TaskActionsProps {
  allTasks: Task[];
}

const DaySchedule = ({ day, allTasks }: { day: DailySchedule, allTasks: Task[] }) => {
    return (
        <div className="mb-4">
            <h3 className="font-bold text-lg mb-2 border-b pb-1">{format(new Date(day.date + 'T00:00:00'), "eeee, MMMM do")}</h3>
            <div className="space-y-2">
                {day.items.map((item, index) => {
                    const task = item.taskId ? allTasks.find(t => t.id === item.taskId) : null;
                    return (
                        <div key={`${item.taskId || 'item'}-${item.startTime}-${index}`} className="flex items-center gap-4 p-2 rounded-md bg-muted/50">
                             <div className="font-mono text-sm bg-background p-1 rounded">
                                {item.startTime}
                            </div>
                            <div className="flex-grow">
                               <p className="font-medium">{item.title}</p>
                               {task?.description && <p className="text-xs text-muted-foreground">{task.description}</p>}
                            </div>
                           <Badge variant="outline">{item.duration} min</Badge>
                        </div>
                    )
                })}
                 {day.items.length === 0 && (
                    <div className="text-center text-sm text-muted-foreground py-10">
                        <Clock className="mx-auto h-8 w-8 mb-2" />
                        No tasks scheduled for this day.
                    </div>
                 )}
            </div>
        </div>
    )
}

const SaveTemplateDialog = ({ children, onSave }: { children: React.ReactNode, onSave: (name: string) => Promise<void>}) => {
    const [open, setOpen] = useState(false);
    const [name, setName] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        if (!name) return;
        setIsSaving(true);
        await onSave(name);
        setIsSaving(false);
        setOpen(false);
    }
    
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Save Schedule as Template</DialogTitle>
                    <DialogDescription>
                        Give this schedule a name so you can easily reuse it later.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <Label htmlFor="template-name">Template Name</Label>
                    <Input id="template-name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g., My Productive Week" />
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button onClick={handleSave} disabled={!name || isSaving}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save Template
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export function TaskActions({ allTasks }: TaskActionsProps) {
  const { user } = useAuth();
  const { tasks: allTasksFromStore, addTask, updateTask, updateTasks } = useTaskStore();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1);

  const unscheduledTasks = allTasks.filter(t => !t.dueDate);

  // --- Step 1 state ---
  const [energyPeak, setEnergyPeak] = useState<'morning' | 'afternoon' | 'evening'>();
  const [preferences, setPreferences] = useState('');
  const [workStartTime, setWorkStartTime] = useState('09:00');
  const [workEndTime, setWorkEndTime] = useState('17:00');
  const [sleepHours, setSleepHours] = useState('8');
  const [workoutFrequency, setWorkoutFrequency] = useState('3');
  
  // --- Step 2 state ---
  const [schedule, setSchedule] = useState<DailySchedule[] | null>(null);

  const handleGenerate = async () => {
    setIsLoading(true);
    setSchedule(null);
    try {
        const today = new Date();
        const start = startOfWeek(today, { weekStartsOn: 1 }); // Monday
        const end = endOfWeek(today, { weekStartsOn: 1 });

        const preferenceString = `
            Work hours: from ${workStartTime} to ${workEndTime}.
            Desired sleep: ${sleepHours} hours per night.
            Workout frequency: ${workoutFrequency} times per week.
            Energy peak: ${energyPeak}.
            Other preferences: ${preferences}
        `;

        const result = await generateSchedule({
            tasks: unscheduledTasks.map(t => ({ id: t.id, title: t.title, description: t.description, priority: t.priority })),
            scheduleStartDate: start.toISOString().split('T')[0],
            scheduleEndDate: end.toISOString().split('T')[0],
            preferences: preferenceString,
        });
      setSchedule(result.schedule);
      setStep(2); // Move to preview
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Scheduling Failed",
        description: "Could not generate a schedule. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const applySchedule = async (scheduleToApply: DailySchedule[]) => {
      if (!user) {
        toast({ variant: 'destructive', title: 'Not authenticated' });
        return;
      }
      
      const tasksToUpdate: Task[] = [];
      const tasksToCreate: Omit<Task, 'id' | 'createdAt'>[] = [];
      let unscheduledTasksCopy = [...unscheduledTasks];

      const processedSchedule = preprocessSchedule(scheduleToApply);

      for (const day of processedSchedule) {
          for (const item of day.items) {
              const scheduledDate = new Date(day.date + 'T00:00:00');
              const [hours, minutes] = item.startTime.split(':').map(Number);
              const taskDate = setMinutes(setHours(scheduledDate, hours), minutes);

              if (item.taskId) {
                  // This is an existing task that needs to be updated
                  const taskToUpdate = allTasksFromStore.find(t => t.id === item.taskId);
                  if (taskToUpdate) {
                      tasksToUpdate.push({
                          ...taskToUpdate,
                          dueDate: taskDate,
                          time: item.startTime,
                          duration: item.duration,
                      });
                  }
              } else if (unscheduledTasksCopy.length > 0) {
                 // This is a generic slot (not AI-created like 'Lunch'). Fill it with a user's task.
                 const taskToSchedule = unscheduledTasksCopy.shift()!; // Take the next unscheduled task
                  tasksToUpdate.push({
                      ...taskToSchedule,
                      dueDate: taskDate,
                      time: item.startTime,
                      duration: item.duration,
                  });
              }
               else {
                  // This is a new, AI-generated task to be created (like 'Lunch' or 'Sleep')
                  tasksToCreate.push({
                      userId: user.uid,
                      title: item.title,
                      priority: 'p4', // Default priority
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
        toast({ title: "No tasks to schedule", description: "The schedule didn't contain any applicable tasks."});
        return;
      }

      try {
          if (tasksToUpdate.length > 0) {
            await updateTasks(user.uid, tasksToUpdate);
          }
          if (tasksToCreate.length > 0) {
            await Promise.all(tasksToCreate.map(t => addTask(user.uid, t)));
          }
          
          toast({ title: "Schedule Applied!", description: `${totalScheduled} tasks have been scheduled.` });
          setOpen(false);
      } catch (e) {
          console.error(e);
          toast({ variant: 'destructive', title: 'Failed to apply schedule' });
      }
  };

  // Function to split sleep tasks that cross midnight
  const preprocessSchedule = (schedule: DailySchedule[]): DailySchedule[] => {
    const newSchedule: DailySchedule[] = JSON.parse(JSON.stringify(schedule)); // Deep copy
    const scheduleMap = new Map(newSchedule.map(day => [day.date, day]));

    for (const day of newSchedule) {
        const itemsToProcess = [...day.items];
        day.items = []; // Clear original items, we'll repopulate

        for (const item of itemsToProcess) {
            if (item.title.toLowerCase().includes('sleep')) {
                const startTime = parse(item.startTime, 'HH:mm', new Date());
                const endTime = parse(item.endTime, 'HH:mm', new Date());

                if (endTime < startTime) { // This means it crosses midnight
                    const today = new Date(day.date + 'T00:00:00');
                    const nextDayDate = addDays(today, 1);
                    const nextDayStr = format(nextDayDate, 'yyyy-MM-dd');
                    
                    const endOfToday = new Date(day.date + 'T23:59:00');
                    const duration1 = (endOfToday.getTime() - startTime.getTime()) / (1000 * 60);

                    // First part of sleep (today)
                    day.items.push({
                        ...item,
                        endTime: '23:59',
                        duration: Math.round(duration1),
                    });

                    // Second part of sleep (tomorrow)
                    const startOfNextDay = new Date(nextDayStr + 'T00:00:00');
                    const duration2 = (endTime.getTime() - startOfNextDay.getTime()) / (1000 * 60);

                    if (scheduleMap.has(nextDayStr)) {
                        scheduleMap.get(nextDayStr)!.items.push({
                            ...item,
                            startTime: '00:00',
                            endTime: item.endTime,
                            duration: Math.round(duration2),
                        });
                    } else {
                        // If next day doesn't exist in schedule, create it
                         scheduleMap.set(nextDayStr, { date: nextDayStr, items: [{
                            ...item,
                            startTime: '00:00',
                            endTime: item.endTime,
                            duration: Math.round(duration2),
                        }]});
                    }
                    continue; // Skip adding the original item
                }
            }
            day.items.push(item); // Add non-sleep items or non-crossing sleep items
        }
    }
    
    return Array.from(scheduleMap.values()).sort((a,b) => a.date.localeCompare(b.date));
  }


  const handleApplySchedule = () => {
      if (!schedule) return;
      applySchedule(schedule);
  };
  
  const handleSaveTemplate = async (name: string) => {
    if (!user || !schedule) {
        toast({ variant: 'destructive', title: "Error", description: "Cannot save template." });
        return;
    }
    try {
        await addScheduleTemplate(user.uid, {
            name,
            authorId: user.uid,
            schedule,
        });
        toast({ title: "Template Saved!", description: `"${name}" is now available in your library.` });
    } catch (e) {
        console.error(e);
        toast({ variant: 'destructive', title: "Save Failed", description: "Could not save the template." });
    }
  };
  
  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
        // Reset state on close
        setIsLoading(false);
        setStep(1);
        setSchedule(null);
        setEnergyPeak(undefined);
        setPreferences('');
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Wand2 className="mr-2 h-4 w-4" />
          AI Scheduler
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-headline flex items-center gap-2">
            <Wand2 /> AI Schedule Generator
          </DialogTitle>
          <DialogDescription>
             Answer a few questions and AI will generate an ideal weekly schedule for your unscheduled tasks.
          </DialogDescription>
        </DialogHeader>

          <>
            {step === 1 && (
                <div className="flex-grow overflow-y-auto p-1">
                    <h3 className="text-lg font-semibold mb-4">Step 1: Your Productivity Profile</h3>
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <Label className="font-semibold">Typical Work/School Hours</Label>
                                <div className="flex items-center gap-2 mt-2">
                                    <Input type="time" value={workStartTime} onChange={(e) => setWorkStartTime(e.target.value)} />
                                    <span>to</span>
                                    <Input type="time" value={workEndTime} onChange={(e) => setWorkEndTime(e.target.value)} />
                                </div>
                            </div>
                            <div>
                                <Label className="font-semibold">Core Needs</Label>
                                <div className="flex items-center gap-2 mt-2">
                                    <Input type="number" value={sleepHours} onChange={(e) => setSleepHours(e.target.value)} className="w-24"/>
                                    <Label>hours of sleep</Label>
                                    <Input type="number" value={workoutFrequency} onChange={(e) => setWorkoutFrequency(e.target.value)} className="w-24 ml-4"/>
                                    <Label>workouts/week</Label>
                                </div>
                            </div>
                        </div>
                         <Separator/>
                         <div>
                            <Label className="font-semibold">When are your energy levels at their peak?</Label>
                             <RadioGroup onValueChange={(v) => setEnergyPeak(v as any)} value={energyPeak} className="mt-2">
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="morning" id="morning" />
                                    <Label htmlFor="morning">Morning (8 AM - 12 PM)</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="afternoon" id="afternoon" />
                                    <Label htmlFor="afternoon">Afternoon (1 PM - 5 PM)</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="evening" id="evening" />
                                    <Label htmlFor="evening">Evening (6 PM - 10 PM)</Label>
                                </div>
                            </RadioGroup>
                         </div>
                          <Separator/>
                          <div>
                            <Label className="font-semibold" htmlFor="preferences">Any other goals or preferences?</Label>
                            <Textarea 
                                id="preferences"
                                placeholder="e.g., I want to learn guitar, No meetings on Fridays, I need to walk the dog twice a day..." 
                                value={preferences}
                                onChange={(e) => setPreferences(e.target.value)}
                                className="mt-2"
                            />
                        </div>
                    </div>
                </div>
            )}
            
            {step === 2 && (
                <div className="flex-grow overflow-y-auto p-1">
                    <h3 className="text-lg font-semibold mb-4">Step 2: Preview Your Ideal Week</h3>
                    <ScrollArea className="h-[500px] border rounded-md p-4 bg-muted/20">
                         {isLoading ? (
                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                                <Loader2 className="h-8 w-8 animate-spin" />
                                <p>AI is planning your ideal week...</p>
                            </div>
                         ) : schedule ? (
                            schedule.map(day => <DaySchedule key={day.date} day={day} allTasks={allTasks} />)
                         ) : (
                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                               <Clock className="h-8 w-8" />
                               <p>Your schedule will appear here.</p>
                            </div>
                         )}
                     </ScrollArea>
                </div>
            )}

            <DialogFooter>
                <div className="w-full flex justify-between">
                    <div>
                      {step > 1 && (
                        <Button variant="ghost" onClick={() => setStep(s => s - 1)}>
                           <ArrowLeft className="ml-2 h-4 w-4" /> Back
                        </Button>
                       )}
                    </div>
                    <div className="flex gap-2">
                        {step === 1 && <Button onClick={handleGenerate} disabled={!energyPeak || isLoading}>{isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Sparkles className="mr-2 h-4 w-4" />}Generate Schedule <ArrowRight className="ml-2 h-4 w-4" /></Button>}
                        {step === 2 && schedule && (
                             <Button onClick={handleGenerate} variant="outline" disabled={isLoading}>
                                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                                Regenerate
                            </Button>
                        )}
                        {step === 2 && schedule && (
                             <SaveTemplateDialog onSave={handleSaveTemplate}>
                                <Button variant="outline">
                                   <Save className="mr-2 h-4 w-4" /> Save as Template
                               </Button>
                             </SaveTemplateDialog>
                        )}
                        {step === 2 && schedule && (
                            <Button onClick={handleApplySchedule}>
                                <Plus className="mr-2 h-4 w-4" />
                                Apply Schedule
                            </Button>
                        )}
                    </div>
                </div>
            </DialogFooter>
          </>
      </DialogContent>
    </Dialog>
  );
}
