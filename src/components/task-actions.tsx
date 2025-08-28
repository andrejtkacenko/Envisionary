
"use client";

import { useState } from 'react';
import { Button } from './ui/button';
import { Wand2, Loader2, Sparkles, Plus, Clock, ListFilter } from 'lucide-react';
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
import { format, setHours, setMinutes } from 'date-fns';

interface TaskActionsProps {
  unscheduledTasks: Task[];
  onSchedule: (updatedTasks: Task[]) => void;
}

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
            </div>
        </div>
    )
}

export function TaskActions({ unscheduledTasks, onSchedule }: TaskActionsProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [schedule, setSchedule] = useState<DailySchedule | null>(null);

  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [forDate, setForDate] = useState(new Date());

  const handleGenerate = async () => {
    if (selectedTasks.length === 0) {
      toast({ variant: 'destructive', title: 'No tasks selected' });
      return;
    }
    setIsLoading(true);
    setSchedule(null);
    try {
      const tasksToSchedule = unscheduledTasks.filter(t => selectedTasks.includes(t.id));
      const result = await generateSchedule({
        tasks: tasksToSchedule.map(t => ({ id: t.id, title: t.title, description: t.description, priority: t.priority })),
        scheduleStartDate: forDate.toISOString(),
        scheduleEndDate: forDate.toISOString(),
        startTime,
        endTime,
      });
      setSchedule(result.schedule[0]); // For now, we only support single-day schedule
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
    
    const scheduledDate = new Date(schedule.date);
    
    const updatedTasks = schedule.items.map(item => {
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
    }).filter((t): t is Task => t !== null);

    onSchedule(updatedTasks);
    setOpen(false);
  };
  
  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
        // Reset state on close
        setIsLoading(false);
        setSchedule(null);
        setSelectedTasks([]);
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
            Select tasks from your inbox and let AI create the ideal schedule for your day.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-grow overflow-hidden">
            {/* Left: Task Selection & Options */}
            <div className="flex flex-col gap-4">
                <h3 className="text-lg font-semibold">1. Select Tasks</h3>
                <div className="flex items-center space-x-2">
                    <Checkbox
                        id="select-all"
                        onCheckedChange={handleSelectAll}
                        checked={selectedTasks.length > 0 && selectedTasks.length === unscheduledTasks.length}
                    />
                    <Label htmlFor="select-all">Select All</Label>
                </div>
                <ScrollArea className="h-64 border rounded-md p-2">
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

                <h3 className="text-lg font-semibold">2. Set Schedule Time</h3>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="start-time">Start Time</Label>
                        <Input id="start-time" type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
                    </div>
                    <div>
                        <Label htmlFor="end-time">End Time</Label>
                        <Input id="end-time" type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
                    </div>
                 </div>

                <Button onClick={handleGenerate} disabled={isLoading || selectedTasks.length === 0} className="mt-4">
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                    Generate Schedule
                </Button>
            </div>
            {/* Right: Schedule Preview */}
            <div className="flex flex-col gap-4">
                <h3 className="text-lg font-semibold">3. Preview</h3>
                 <ScrollArea className="h-full border rounded-md p-4 bg-muted/20">
                     {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                            <Loader2 className="h-8 w-8 animate-spin" />
                            <p>AI is planning your day...</p>
                        </div>
                     ) : schedule ? (
                        <DaySchedule day={schedule} allTasks={unscheduledTasks} />
                     ) : (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                           <Clock className="h-8 w-8" />
                           <p>Your schedule will appear here.</p>
                        </div>
                     )}
                 </ScrollArea>
            </div>
        </div>

        {schedule && (
            <DialogFooter>
                <Button onClick={handleApplySchedule}>
                    <Plus className="mr-2 h-4 w-4" />
                    Apply Schedule
                </Button>
            </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
