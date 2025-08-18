
"use client";

import { useState } from 'react';
import { format, parse } from 'date-fns';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, Sparkles, Download, Calendar, Clock } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { generateSchedule } from '@/ai/flows/generate-schedule';
import type { DailySchedule } from '@/types';
import { generateIcs } from '@/ai/flows/generate-ics';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';

interface DayScheduleDialogProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    date: Date;
}

const formSchema = z.object({
  prompt: z.string().min(1, 'Please enter a prompt for your day.'),
});

export function DayScheduleDialog({ isOpen, onOpenChange, date }: DayScheduleDialogProps) {
  const [schedule, setSchedule] = useState<DailySchedule | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const { toast } = useToast();

  const form = useForm<{ prompt: string }>({
    resolver: zodResolver(formSchema),
    defaultValues: { prompt: '' },
  });

  const handleGenerateSchedule = async ({ prompt }: { prompt: string }) => {
    setIsLoading(true);
    setSchedule(null);
    try {
      const result = await generateSchedule({
        dailyGoals: [{ day: format(date, 'EEEE'), tasks: prompt }],
        timeConstraints: 'Generate a schedule for the full day.',
        priorities: 'Focus on the tasks provided.',
      });
      if (result.weeklySchedule && result.weeklySchedule.length > 0) {
        setSchedule(result.weeklySchedule[0]);
      } else {
        throw new Error("AI did not return a schedule.");
      }
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Generation Failed",
        description: "Could not generate a schedule. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadIcs = async () => {
    if (!schedule) {
        toast({ variant: 'destructive', title: 'No schedule to download.' });
        return;
    }
    setIsDownloading(true);

    try {
        const { icsString } = await generateIcs({ schedule, date: date.toISOString() });
        if (!icsString) {
            throw new Error("Failed to generate .ics data.");
        }

        const blob = new Blob([icsString], { type: 'text/calendar' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `schedule-${format(date, 'yyyy-MM-dd')}.ics`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        toast({
            title: "Schedule Downloaded",
            description: "You can now import the .ics file into your calendar app.",
        });

    } catch (error) {
      console.error("Failed to generate or download .ics file", error);
      toast({
        variant: "destructive",
        title: "Download Failed",
        description: "Could not create the calendar file. Please try again.",
      });
    } finally {
        setIsDownloading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-headline flex items-center gap-2">
            <Calendar className="h-5 w-5" /> Plan for {format(date, 'PPP')}
          </DialogTitle>
          <DialogDescription>
            Tell the AI what you want to accomplish, and it will generate a schedule for the day.
          </DialogDescription>
        </DialogHeader>
        
        {!schedule ? (
            <Form {...form}>
                <form onSubmit={form.handleSubmit(handleGenerateSchedule)} className="space-y-4 py-4">
                <FormField
                    control={form.control}
                    name="prompt"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>What are your goals for the day?</FormLabel>
                        <FormControl>
                        <Textarea placeholder="e.g., Morning workout, finish the report, and have dinner with friends." {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                    Generate Schedule
                </Button>
                </form>
            </Form>
        ) : (
            <div className="py-4 space-y-4">
                <h3 className="font-semibold text-foreground">Generated Schedule:</h3>
                <ScrollArea className="h-64">
                    <div className="space-y-2 pr-4">
                        {schedule.schedule.map(item => (
                            <div key={item.id} className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
                                <Badge variant="secondary" className="w-28 justify-center text-xs"><Clock className="mr-1 h-3 w-3" />{item.time}</Badge>
                                <p className="text-sm flex-grow">{item.task}</p>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
                <DialogFooter className='sm:justify-between gap-2'>
                     <Button variant="outline" onClick={() => setSchedule(null)} disabled={isDownloading}>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Regenerate
                    </Button>
                    <Button onClick={handleDownloadIcs} disabled={isDownloading}>
                        {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                        Download .ics File
                    </Button>
                </DialogFooter>
            </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
