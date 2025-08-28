
"use client";

import { useState, useCallback, useEffect } from 'react';
import { Loader2, Wand2, Calendar, FileText, X } from 'lucide-react';
import type { Goal, DailySchedule, ScheduleTemplate } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { generateSchedule } from '@/ai/flows/generate-schedule';
import { saveSchedule, addScheduleTemplate, getScheduleTemplates } from '@/lib/goals-service';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Input } from './ui/input';
import { Checkbox } from './ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ScheduleTemplates } from './schedule-templates';


// --- PROPS ---
interface TaskActionsProps {
  allGoals: Goal[];
  onScheduleApplied: (schedule: DailySchedule[]) => void;
}

// --- VIEWER COMPONENT ---
const ScheduleViewer = ({ 
    schedule, 
    onGoBack,
    onApply,
    onSaveTemplate
}: { 
    schedule: DailySchedule[], 
    onGoBack: () => void,
    onApply: (schedule: DailySchedule[]) => void,
    onSaveTemplate: (name: string) => void,
}) => {
    const [isSaving, setIsSaving] = useState(false);
    const [templateName, setTemplateName] = useState("");
    const [showSaveInput, setShowSaveInput] = useState(false);

    const handleSave = () => {
        if (!templateName) return;
        setIsSaving(true);
        onSaveTemplate(templateName);
        setIsSaving(false);
        setShowSaveInput(false);
    }
    
    return (
        <div className="flex flex-col h-full">
            <DialogHeader className="flex-shrink-0">
                <DialogTitle>Generated Schedule</DialogTitle>
                <DialogDescription>Review the schedule below or go back to regenerate.</DialogDescription>
            </DialogHeader>
            <div className="flex-grow my-4 min-h-0">
                <ScrollArea className="h-full pr-4">
                    <div className="space-y-4">
                        {schedule.map(day => (
                            <div key={day.day}>
                                <h4 className="font-semibold text-sm mb-2">{day.day}</h4>
                                <div className="space-y-2">
                                {day.schedule.map(item => (
                                    <div key={item.id} className="text-xs p-2 bg-muted/50 rounded-md">
                                        <span className="font-medium">{item.time}:</span> {item.task} ({item.priority})
                                    </div>
                                ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </div>
             <DialogFooter className="flex-shrink-0 gap-2">
                <Button variant="ghost" onClick={onGoBack}>Back to Generator</Button>
                {showSaveInput ? (
                     <div className="flex gap-2">
                        <Input 
                            placeholder="Enter template name..." 
                            value={templateName}
                            onChange={(e) => setTemplateName(e.target.value)}
                        />
                        <Button onClick={handleSave} disabled={isSaving}>
                            {isSaving ? <Loader2 className="h-4 w-4 animate-spin"/> : "Save"}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setShowSaveInput(false)}><X className="h-4 w-4"/></Button>
                    </div>
                ) : (
                    <Button variant="outline" onClick={() => setShowSaveInput(true)}>Save as Template</Button>
                )}
                <Button onClick={() => onApply(schedule)}>Apply to Planner</Button>
            </DialogFooter>
        </div>
    );
};


// --- MAIN COMPONENT ---
export function TaskActions({ allGoals, onScheduleApplied }: TaskActionsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("generator");

  // Generator State
  const [preferences, setPreferences] = useState({
    priorities: '',
    workHours: '9 AM - 5 PM, Mon-Fri',
    sleepHours: '11 PM - 7 AM',
    mealHours: 'Lunch around 1 PM, Dinner around 7 PM',
    restHours: 'Short breaks during work, evenings free on weekends',
    habits: '',
    commitments: '',
  });
  const [selectedGoals, setSelectedGoals] = useState<Goal[]>([]);
  const [generatedSchedule, setGeneratedSchedule] = useState<DailySchedule[] | null>(null);

  // Template State
  const [templates, setTemplates] = useState<ScheduleTemplate[]>([]);
  const fetchTemplates = useCallback(async () => {
        if (!user) return;
        try {
            const fetchedTemplates = await getScheduleTemplates(user.uid);
            setTemplates(fetchedTemplates);
        } catch (error) {
            console.error(error);
        }
  }, [user]);

  useEffect(() => {
    if (activeTab === "templates" && user) {
        fetchTemplates();
    }
  }, [activeTab, user, fetchTemplates]);


  const handleGenerateSchedule = async () => {
    if (!user) return;
    setIsLoading(true);
    setGeneratedSchedule(null);
    try {
      const result = await generateSchedule({
        goals: selectedGoals.map(g => ({ id: g.id, title: g.title, estimatedTime: g.estimatedTime })),
        preferences: preferences,
      });
      setGeneratedSchedule(result.weeklySchedule);
    } catch (e) {
      console.error(e);
      toast({ variant: 'destructive', title: 'Failed to generate schedule.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplySchedule = async (schedule: DailySchedule[]) => {
    if (!user) return;
    try {
      await saveSchedule(user.uid, schedule);
      onScheduleApplied(schedule);
      setOpen(false);
      toast({ title: 'Schedule applied successfully!' });
    } catch (e) {
      console.error(e);
      toast({ variant: 'destructive', title: 'Failed to apply schedule.' });
    }
  };
  
   const handleSaveTemplate = async (name: string) => {
        if (!user || !generatedSchedule) return;
        try {
            await addScheduleTemplate(user.uid, {
                name,
                type: 'week',
                data: generatedSchedule,
            });
            toast({ title: "Template saved successfully!" });
            fetchTemplates();
            setActiveTab("templates");
        } catch(e) {
            console.error(e);
            toast({ variant: 'destructive', title: 'Failed to save template.' });
        }
   };

  const handleGoalSelection = (goal: Goal) => {
    setSelectedGoals(prev => 
      prev.some(g => g.id === goal.id) 
        ? prev.filter(g => g.id !== goal.id) 
        : [...prev, goal]
    );
  };
  
  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
        setGeneratedSchedule(null);
        setSelectedGoals([]);
        setIsLoading(false);
    }
  };
  

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Wand2 className="mr-2 h-4 w-4" /> AI Scheduler
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">

        {generatedSchedule ? (
            <ScheduleViewer 
                schedule={generatedSchedule} 
                onGoBack={() => setGeneratedSchedule(null)}
                onApply={handleApplySchedule}
                onSaveTemplate={handleSaveTemplate}
            />
        ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-grow flex flex-col min-h-0">
                <DialogHeader className="flex-shrink-0">
                    <DialogTitle className="flex items-center gap-2">
                        <Wand2 className="h-6 w-6 text-primary" /> AI Schedule Generator
                    </DialogTitle>
                    <DialogDescription>
                        Plan your week with AI assistance. Fill in your preferences, select your goals, and let the AI build your schedule.
                    </DialogDescription>
                </DialogHeader>
                 <TabsList className="grid w-full grid-cols-2 mt-4 flex-shrink-0">
                    <TabsTrigger value="generator"><Calendar className="mr-2 h-4 w-4" />Generator</TabsTrigger>
                    <TabsTrigger value="templates"><FileText className="mr-2 h-4 w-4" />Templates</TabsTrigger>
                </TabsList>
                <TabsContent value="generator" className="flex-grow mt-2 overflow-hidden">
                    <div className="grid md:grid-cols-2 gap-6 h-full">
                        <Card className="flex flex-col">
                            <CardHeader><CardTitle>1. Preferences</CardTitle></CardHeader>
                            <CardContent className="flex-grow space-y-4 overflow-y-auto">
                                <div>
                                    <Label>Main Priorities for the week?</Label>
                                    <Textarea value={preferences.priorities} onChange={e => setPreferences(p => ({...p, priorities: e.target.value}))}/>
                                </div>
                                <div>
                                    <Label>Regular Habits to include?</Label>
                                    <Input value={preferences.habits} onChange={e => setPreferences(p => ({...p, habits: e.target.value}))}/>
                                </div>
                                <div>
                                    <Label>Fixed Commitments?</Label>
                                    <Input value={preferences.commitments} onChange={e => setPreferences(p => ({...p, commitments: e.target.value}))}/>
                                </div>
                                <div>
                                    <Label>Work/Study Hours?</Label>
                                    <Input value={preferences.workHours} onChange={e => setPreferences(p => ({...p, workHours: e.target.value}))}/>
                                </div>
                                 <div>
                                    <Label>Sleep Hours?</Label>
                                    <Input value={preferences.sleepHours} onChange={e => setPreferences(p => ({...p, sleepHours: e.target.value}))}/>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="flex flex-col">
                             <CardHeader><CardTitle>2. Select Goals</CardTitle></CardHeader>
                             <CardContent className="flex-grow overflow-y-auto space-y-2">
                                <ScrollArea className="h-full pr-2">
                                {allGoals.length > 0 ? allGoals.map(goal => (
                                    <div key={goal.id} className="flex items-center space-x-2 p-2 rounded-md hover:bg-muted">
                                        <Checkbox 
                                            id={`goal-${goal.id}`}
                                            checked={selectedGoals.some(g => g.id === goal.id)}
                                            onCheckedChange={() => handleGoalSelection(goal)}
                                        />
                                        <label htmlFor={`goal-${goal.id}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                            {goal.title}
                                        </label>
                                    </div>
                                )) : <p className="text-sm text-muted-foreground">No goals found.</p>}
                                </ScrollArea>
                            </CardContent>
                            <DialogFooter className="m-6 mt-auto">
                                <Button onClick={handleGenerateSchedule} disabled={isLoading} className="w-full">
                                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Wand2 className="mr-2 h-4 w-4"/>}
                                    Generate Schedule
                                </Button>
                            </DialogFooter>
                        </Card>
                    </div>
                </TabsContent>
                <TabsContent value="templates" className="flex-grow mt-2 overflow-hidden">
                   <div className="h-full">
                     <ScheduleTemplates onApplyTemplate={handleApplySchedule} templates={templates} fetchTemplates={fetchTemplates}/>
                   </div>
                </TabsContent>
            </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}

    