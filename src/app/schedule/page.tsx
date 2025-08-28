
"use client";

import { useState } from 'react';
import { IdealScheduleForm, type SchedulePreferences } from '@/components/ideal-schedule-form';
import { RecommendationChat } from '@/components/recommendation-chat';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { generateIdealSchedule } from '@/ai/tools/schedule-actions';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Wand2, CalendarCheck, Lightbulb } from 'lucide-react';
import type { DailySchedule } from '@/types';
import { format } from 'date-fns';

const DaySchedule = ({ day }: { day: DailySchedule }) => {
    return (
        <div className="mb-6">
            <h3 className="font-bold text-lg mb-2 border-b pb-1">{format(new Date(day.date), "eeee, MMMM do")}</h3>
            <div className="space-y-2">
                {day.items.map((item, index) => (
                    <div key={index} className="flex items-center gap-4 p-3 rounded-md bg-muted/50">
                         <div className="font-mono text-sm bg-background p-1 rounded">
                            {item.startTime}
                        </div>
                        <div className="flex-grow">
                           <p className="font-medium">{item.title}</p>
                           {/* Additional task details could go here if needed */}
                        </div>
                       <div className="text-xs text-muted-foreground">{item.duration} min</div>
                    </div>
                ))}
                 {day.items.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No scheduled items for this day.</p>
                 )}
            </div>
        </div>
    )
}


export default function SchedulePage() {
    const { toast } = useToast();
    const [preferences, setPreferences] = useState<SchedulePreferences | null>(null);
    const [analysis, setAnalysis] = useState<string[]>([]);
    const [schedule, setSchedule] = useState<DailySchedule[] | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleFormChange = (newPreferences: SchedulePreferences, newAnalysis: string) => {
        setPreferences(newPreferences);
        if (newAnalysis) {
          setAnalysis(prev => [...prev, newAnalysis]);
        }
    };
    
    const handleGenerateClick = async () => {
        if (!preferences) {
            toast({ variant: 'destructive', title: 'Please fill out the form first.' });
            return;
        }
        setIsLoading(true);
        setSchedule(null);
        try {
            const result = await generateIdealSchedule({
                ...preferences,
                // These are arrays, so join them.
                mainGoals: preferences.mainGoals.join(', '),
                priorities: preferences.priorities.join(', '),
                fixedEvents: preferences.fixedEvents.join(', '),
                selfCare: preferences.selfCare.join(', '),
            });
            if (result.schedule) {
                setSchedule(result.schedule);
            } else {
                 toast({ variant: 'destructive', title: 'Could not generate a schedule.'});
            }
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'An error occurred while generating the schedule.'});
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
                        <Wand2 /> Ideal Schedule Generator
                    </h1>
                    <p className="text-muted-foreground">
                       Answer the questions and let our AI build your personalized productivity plan.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Left Column: Form & Chat */}
                <div className="lg:col-span-3 space-y-6">
                    <IdealScheduleForm onFormChange={handleFormChange} />
                    <RecommendationChat messages={analysis} />
                </div>

                {/* Right Column: Schedule Preview */}
                <div className="lg:col-span-2">
                    <Card className="sticky top-24">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><CalendarCheck/> Your Generated Schedule</CardTitle>
                            <CardDescription>Click the button below to generate your plan based on your answers.</CardDescription>
                        </CardHeader>
                        <CardContent>
                             <Button onClick={handleGenerateClick} disabled={isLoading || !preferences} className="w-full mb-4">
                                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Wand2 className="mr-2 h-4 w-4"/>}
                                {isLoading ? 'Generating...' : 'Generate My Ideal Schedule'}
                             </Button>

                             <div className="h-[600px] overflow-y-auto pr-2">
                                {schedule ? (
                                    schedule.map(day => <DaySchedule key={day.date} day={day} />)
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground bg-muted/20 rounded-lg">
                                        <Lightbulb className="h-12 w-12 mb-4"/>
                                        <h3 className="font-semibold">Your schedule will appear here.</h3>
                                        <p className="text-sm">Fill out the form and click generate.</p>
                                    </div>
                                )}
                             </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
