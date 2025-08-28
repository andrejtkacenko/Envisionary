
"use client";

import { useState } from 'react';
import { Button } from './ui/button';
import { Wand2, Loader2, Sparkles, Plus, Clock, ListFilter, ArrowRight, ArrowLeft } from 'lucide-react';
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
import { Task, DailySchedule } from '@/types';
import { generateSchedule } from '@/ai/tools/schedule-actions';
import { ScrollArea } from './ui/scroll-area';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { format, setHours, setMinutes, startOfWeek, addDays, endOfWeek } from 'date-fns';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Textarea } from './ui/textarea';
import { Separator } from './ui/separator';

interface TaskActionsProps {
  unscheduledTasks: Task[];
  onSchedule: (updatedTasks: Task[]) => void;
}

const goals = [
    { id: 'career', label: 'Career Growth' },
    { id: 'learning', label: 'Learn a New Skill' },
    { id: 'health', label: 'Improve Health & Fitness' },
    { id: 'finance', label: 'Financial Planning' },
    { id: 'personal', label: 'Personal Projects' },
];


const DaySchedule = ({ day, allTasks }: { day: DailySchedule, allTasks: Task[] }) => {
    return (
        <div className="mb-4">
            <h3 className="font-bold text-lg mb-2 border-b pb-1">{format(new Date(day.date), "eeee, MMMM do")}</h3>
            <div className="space-y-2">
                {day.items.map(item => {
                    const task = allTasks.find(t => t.id === item.taskId);
                    return (
                        <div key={item.taskId} className="flex items-center gap-4 p-2 rounded-md bg-muted/50">
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

export function TaskActions({ unscheduledTasks, onSchedule }: TaskActionsProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1);

  // --- Step 1 state ---
  const [mainGoals, setMainGoals] = useState<string[]>([]);
  const [energyPeak, setEnergyPeak] = useState<'morning' | 'afternoon' | 'evening'>();
  const [preferences, setPreferences] = useState('');
  
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
            Main goals: ${mainGoals.join(', ')}.
            Energy peak: ${energyPeak}.
            Other preferences: ${preferences}
        `;

        const result = await generateSchedule({
            tasks: tasksToSchedule.map(t => ({ id: t.id, title: t.title, description: t.description, priority: t.priority })),
            scheduleStartDate: start.toISOString(),
            scheduleEndDate: end.toISOString(),
            startTime: '08:00', // Default start time
            endTime: '22:00',   // Default end time
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

  const handleApplySchedule = () => {
    if (!schedule) return;
    
    const allUpdatedTasks = schedule.flatMap(day => {
        const scheduledDate = new Date(day.date);
        return day.items.map(item => {
             const originalTask = unscheduledTasks.find(t => t.id === item.taskId);
            if (!originalTask) return null;

            const [hours, minutes] = item.startTime.split(':').map(Number);
            const taskDate = setMinutes(setHours(scheduledDate, hours), minutes);

            return {
                ...originalTask,
                dueDate: taskDate,
                time: item.startTime,
                duration: item.duration,
            };
        })
    }).filter((t): t is Task => t !== null);

    onSchedule(allUpdatedTasks);
    setOpen(false);
  };
  
  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
        // Reset state on close
        setIsLoading(false);
        setStep(1);
        setSchedule(null);
        setSelectedTasks([]);
        setMainGoals([]);
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
          <DialogDescription>
            Answer a few questions and select tasks to generate your ideal weekly schedule.
          </DialogDescription>
        </DialogHeader>
        
        {step === 1 && (
            <div className="flex-grow overflow-y-auto p-1">
                <h3 className="text-lg font-semibold mb-4">Step 1: Your Productivity Profile</h3>
                <div className="space-y-6">
                    <div>
                        <Label className="font-semibold">What are your main goals for the week?</Label>
                        <div className="mt-2 space-y-2">
                        {goals.map((item) => (
                            <div key={item.id} className="flex flex-row items-start space-x-3 space-y-0">
                                <Checkbox
                                    id={`goal-${item.id}`}
                                    checked={mainGoals.includes(item.label)}
                                    onCheckedChange={(checked) => {
                                        return checked
                                            ? setMainGoals([...mainGoals, item.label])
                                            : setMainGoals(mainGoals.filter((value) => value !== item.label));
                                    }}
                                />
                                <Label htmlFor={`goal-${item.id}`} className="font-normal">{item.label}</Label>
                            </div>
                        ))}
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
                        <Label className="font-semibold" htmlFor="preferences">Any other preferences?</Label>
                        <Textarea 
                            id="preferences"
                            placeholder="e.g., I prefer creative work in the morning, No meetings on Fridays..." 
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
                        onCheckedChange={handleSelectAll}
                        checked={selectedTasks.length > 0 && selectedTasks.length === unscheduledTasks.length}
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
                            <p>AI is planning your day...</p>
                        </div>
                     ) : schedule ? (
                        schedule.map(day => <DaySchedule key={day.date} day={day} allTasks={unscheduledTasks} />)
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
                    {step === 1 && <Button onClick={() => setStep(2)} disabled={!energyPeak || mainGoals.length === 0}>Next <ArrowRight className="ml-2 h-4 w-4" /></Button>}
                    {step === 2 && (
                        <Button onClick={handleGenerate} disabled={isLoading || selectedTasks.length === 0}>
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                            Generate Schedule
                        </Button>
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
      </DialogContent>
    </Dialog>
  );
}
