

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
import { Task, DailySchedule, ScheduleTemplate } from '@/types';
import { generateSchedule } from '@/ai/tools/schedule-actions';
import { getScheduleTemplates, deleteScheduleTemplate, addScheduleTemplate } from '@/lib/goals-service';
import { useTaskStore } from '@/hooks/use-task-store';
import { ScrollArea } from './ui/scroll-area';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { format, setHours, setMinutes, startOfWeek, endOfWeek } from 'date-fns';
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


const TemplatesView = ({ onApply }: { onApply: (template: ScheduleTemplate) => void }) => {
    const [templates, setTemplates] = useState<ScheduleTemplate[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { user } = useAuth();
    const { toast } = useToast();

    useEffect(() => {
        if (!user) return;
        const fetchTemplates = async () => {
            setIsLoading(true);
            try {
                const fetchedTemplates = await getScheduleTemplates(user.uid);
                setTemplates(fetchedTemplates.filter(t => t.schedule && t.schedule.length > 0)); // Filter out templates without a schedule
            } catch (error) {
                console.error("Failed to fetch schedule templates:", error);
                toast({ variant: "destructive", title: "Error", description: "Could not load templates." });
            } finally {
                setIsLoading(false);
            }
        }
        fetchTemplates();
    }, [user, toast]);

    const handleDelete = async (templateId: string) => {
        if (!user) return;
        try {
            await deleteScheduleTemplate(user.uid, templateId);
            setTemplates(prev => prev.filter(t => t.id !== templateId));
            toast({ title: "Template Deleted" });
        } catch (e) {
            toast({ variant: "destructive", title: "Error", description: "Could not delete template." });
        }
    }

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground mt-4">Loading Templates...</p>
            </div>
        );
    }
    
    return (
        <div className="flex-grow overflow-y-auto p-1 h-full">
            {templates.length === 0 ? (
                <div className="text-center text-muted-foreground py-12 border rounded-lg bg-card/50 h-96 flex flex-col justify-center items-center">
                    <CalendarDays className="mx-auto h-12 w-12" />
                    <p className="mt-4 text-lg">No Schedule Templates Yet</p>
                    <p className="text-sm">Generate a schedule and save it as a template to see it here.</p>
                </div>
            ) : (
                <ScrollArea className="h-96">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {templates.map(template => (
                        <Card key={template.id} className="flex flex-col">
                            <CardHeader>
                                <CardTitle className="font-headline text-lg">{template.name}</CardTitle>
                                <CardDescription>Created on {format(template.createdAt.toDate(), 'PPP')}</CardDescription>
                            </CardHeader>
                             <CardContent className="flex-grow">
                                <p className="text-sm font-medium text-muted-foreground">
                                    Plan for {template.schedule?.length || 0} days.
                                </p>
                            </CardContent>
                            <CardFooter className="flex justify-end gap-2">
                                <AlertDialog>
                                    <AlertDialogTrigger asChild><Button variant="destructive" size="icon"><Trash2 className="h-4 w-4"/></Button></AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                                        <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(template.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                                <Button variant="outline" onClick={() => onApply(template)}><Play className="mr-2 h-4 w-4"/>Apply</Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
                </ScrollArea>
            )}
        </div>
    );
};


export function TaskActions({ allTasks }: TaskActionsProps) {
  const { user } = useAuth();
  const { updateTasks } = useTaskStore();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [view, setView] = useState<'generator' | 'templates'>('generator');

  const unscheduledTasks = allTasks.filter(t => !t.dueDate);

  // --- Step 1 state ---
  const [energyPeak, setEnergyPeak] = useState<'morning' | 'afternoon' | 'evening'>();
  const [preferences, setPreferences] = useState('');
  const [workStartTime, setWorkStartTime] = useState('09:00');
  const [workEndTime, setWorkEndTime] = useState('17:00');
  const [sleepHours, setSleepHours] = useState('8');
  const [workoutFrequency, setWorkoutFrequency] = useState('3');

  
  // --- Step 2 state ---
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  
  // --- Step 3 state ---
  const [schedule, setSchedule] = useState<DailySchedule[] | null>(null);

  const handleGenerate = async () => {
    if (selectedTasks.length === 0) {
      toast({ variant: 'destructive', title: 'No tasks selected' });
      return;
    }
    setIsLoading(true);
    setSchedule(null);
    try {
        const tasksToSchedule = unscheduledTasks.filter(t => selectedTasks.includes(t.id));
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
            tasks: tasksToSchedule.map(t => ({ id: t.id, title: t.title, description: t.description, priority: t.priority })),
            scheduleStartDate: start.toISOString().split('T')[0],
            scheduleEndDate: end.toISOString().split('T')[0],
            preferences: preferenceString,
        });
      setSchedule(result.schedule);
      setStep(3); // Move to preview
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

  const applySchedule = async (scheduleToApply: DailySchedule[], tasksToSchedule: Task[]) => {
      if (!user) {
        toast({ variant: 'destructive', title: 'Not authenticated' });
        return;
      }
      
      const tasksToUpdate: Task[] = [];
      let taskIndex = 0;

      for (const day of scheduleToApply) {
          for (const item of day.items) {
              if (item.taskId || item.title.toLowerCase().includes('lunch') || item.title.toLowerCase().includes('break')) {
                  continue;
              }

              if (taskIndex >= tasksToSchedule.length) break;

              const taskToUpdate = tasksToSchedule[taskIndex];
              
              const scheduledDate = new Date(day.date + 'T00:00:00');
              const [hours, minutes] = item.startTime.split(':').map(Number);
              taskToUpdate.dueDate = setMinutes(setHours(scheduledDate, hours), minutes);
              taskToUpdate.time = item.startTime;
              taskToUpdate.duration = item.duration;
              
              tasksToUpdate.push(taskToUpdate);
              taskIndex++;
          }
           if (taskIndex >= tasksToSchedule.length) break;
      }

      if (tasksToUpdate.length === 0) {
        toast({ title: "No tasks to schedule", description: "The schedule didn't contain any slots for your tasks."});
        return;
      }

      try {
          await updateTasks(user.uid, tasksToUpdate);
          toast({ title: "Schedule Applied!", description: `${tasksToUpdate.length} tasks have been scheduled.` });
          setOpen(false);
      } catch (e) {
          console.error(e);
          toast({ variant: 'destructive', title: 'Failed to apply schedule' });
      }
  };


  const handleApplySchedule = () => {
      if (!schedule) return;
      const tasksToSchedule = allTasks.filter(t => selectedTasks.includes(t.id));
      applySchedule(schedule, tasksToSchedule);
  };
  
  const handleApplyTemplate = async (template: ScheduleTemplate) => {
      const tasksToSchedule = allTasks.filter(t => !t.dueDate);
      if (tasksToSchedule.length === 0) {
          toast({ title: "No tasks to schedule", description: "Your inbox is empty." });
          return;
      }
      await applySchedule(template.schedule, tasksToSchedule);
  }

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
        setView('generator');
        setSchedule(null);
        setSelectedTasks([]);
        setEnergyPeak(undefined);
        setPreferences('');
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTasks(unscheduledTasks.map(t => t.id));
    } else {
      setSelectedTasks([]);
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
          <div className="flex justify-between items-center">
            <DialogDescription>
              {view === 'generator' 
                ? 'Answer a few questions to generate your ideal weekly schedule.'
                : 'Apply a saved template to your unscheduled tasks.'}
            </DialogDescription>
            <div className="flex items-center gap-1 p-1 rounded-lg bg-muted">
                <Button size="sm" variant={view === 'generator' ? 'secondary' : 'ghost'} onClick={() => setView('generator')}><Wand2 className="mr-2 h-4 w-4"/>Generator</Button>
                <Button size="sm" variant={view === 'templates' ? 'secondary' : 'ghost'} onClick={() => setView('templates')}><BookCopy className="mr-2 h-4 w-4"/>Templates</Button>
            </div>
          </div>
        </DialogHeader>

        {view === 'generator' && (
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
                    <h3 className="text-lg font-semibold">Step 2: Select Tasks to Schedule</h3>
                    <div className="flex items-center space-x-2 my-4">
                        <Checkbox
                            id="select-all"
                            onCheckedChange={(checked) => handleSelectAll(Boolean(checked))}
                            checked={unscheduledTasks.length > 0 && selectedTasks.length === unscheduledTasks.length}
                        />
                        <Label htmlFor="select-all">Select All ({unscheduledTasks.length} tasks)</Label>
                    </div>
                    <ScrollArea className="h-96 border rounded-md p-2">
                        {unscheduledTasks.length > 0 ? (
                            unscheduledTasks.map(task => (
                                <div key={task.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-muted">
                                    <Checkbox 
                                        id={`task-${task.id}`}
                                        checked={selectedTasks.includes(task.id)}
                                        onCheckedChange={(checked) => {
                                            setSelectedTasks(prev => 
                                                checked ? [...prev, task.id] : prev.filter(id => id !== task.id)
                                            )
                                        }}
                                    />
                                    <Label htmlFor={`task-${task.id}`} className="font-medium cursor-pointer w-full">{task.title}</Label>
                                </div>
                            ))
                        ) : (
                            <p className="text-sm text-muted-foreground text-center py-10">Your inbox is empty!</p>
                        )}
                    </ScrollArea>
                </div>
            )}
            
            {step === 3 && (
                <div className="flex-grow overflow-y-auto p-1">
                    <h3 className="text-lg font-semibold mb-4">Step 3: Preview Your Ideal Week</h3>
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
                           <ArrowLeft className="mr-2 h-4 w-4" /> Back
                        </Button>
                       )}
                    </div>
                    <div className="flex gap-2">
                        {step === 1 && <Button onClick={() => setStep(2)} disabled={!energyPeak}>Next <ArrowRight className="ml-2 h-4 w-4" /></Button>}
                        {step === 2 && (
                            <Button onClick={handleGenerate} disabled={isLoading || selectedTasks.length === 0}>
                                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                                Generate Schedule
                            </Button>
                        )}
                        {step === 3 && schedule && (
                             <Button onClick={handleGenerate} variant="outline" disabled={isLoading}>
                                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                                Regenerate
                            </Button>
                        )}
                        {step === 3 && schedule && (
                             <SaveTemplateDialog onSave={handleSaveTemplate}>
                                <Button variant="outline">
                                   <Save className="mr-2 h-4 w-4" /> Save as Template
                               </Button>
                             </SaveTemplateDialog>
                        )}
                        {step === 3 && schedule && (
                            <Button onClick={handleApplySchedule}>
                                <Plus className="mr-2 h-4 w-4" />
                                Apply Schedule
                            </Button>
                        )}
                    </div>
                </div>
            </DialogFooter>
          </>
        )}

        {view === 'templates' && <TemplatesView onApply={handleApplyTemplate} />}
        
      </DialogContent>
    </Dialog>
  );
}
