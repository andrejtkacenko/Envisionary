
"use client";

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from './ui/form';
import { Checkbox } from './ui/checkbox';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Separator } from './ui/separator';

const scheduleSchema = z.object({
    mainGoals: z.array(z.string()).min(1, 'Please select at least one goal.'),
    priorities: z.array(z.string()).min(1, 'Please select at least one priority.'),
    sleepHours: z.string().min(1, 'Please select sleep hours.'),
    energyPeak: z.enum(['morning', 'afternoon', 'evening'], { required_error: 'Please select your energy peak.' }),
    fixedEvents: z.array(z.string()),
    pastObstacles: z.string().optional(),
    selfCare: z.array(z.string()),
});

export type SchedulePreferences = z.infer<typeof scheduleSchema>;

const goals = [
    { id: 'career', label: 'Career Growth' },
    { id: 'learning', label: 'Learn a New Skill' },
    { id: 'health', label: 'Improve Health & Fitness' },
    { id: 'finance', label: 'Financial Planning' },
    { id: 'personal', label: 'Personal Projects' },
];

const priorities = [
    { id: 'work', label: 'Work/Job' },
    { id: 'study', label: 'School/University' },
    { id: 'personal', label: 'Personal Life' },
];

const selfCareActivities = [
    { id: 'exercise', label: 'Exercise/Workout' },
    { id: 'reading', label: 'Reading' },
    { id: 'hobby', label: 'Hobby/Creative Time' },
    { id: 'social', label: 'Socializing' },
    { id: 'relaxation', label: 'Meditation/Relaxation' },
];

interface IdealScheduleFormProps {
    onFormChange: (data: SchedulePreferences, analysis: string) => void;
}

export const IdealScheduleForm = ({ onFormChange }: IdealScheduleFormProps) => {
    const form = useForm<SchedulePreferences>({
        resolver: zodResolver(scheduleSchema),
        defaultValues: {
            mainGoals: [],
            priorities: [],
            sleepHours: '8',
            energyPeak: undefined,
            fixedEvents: [],
            pastObstacles: '',
            selfCare: [],
        },
    });

    const watchedValues = form.watch();

    useEffect(() => {
        const subscription = form.watch((value, { name, type }) => {
            if (type === 'change') {
                const analysisMap: Record<string, string> = {
                    sleepHours: `I see you need ${value.sleepHours} hours of sleep. I'll make sure to reserve that time for rest.`,
                    energyPeak: `Got it. Your energy peaks in the ${value.energyPeak}. I'll schedule your most demanding tasks for then.`,
                };

                const analysis = name && analysisMap[name] ? analysisMap[name] : '';
                onFormChange(value as SchedulePreferences, analysis);
            }
        });
        return () => subscription.unsubscribe();
    }, [form, onFormChange]);
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>Your Productivity Profile</CardTitle>
                <CardDescription>Answer these questions to help the AI understand your needs.</CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form className="space-y-8">
                        <FormField
                            control={form.control}
                            name="mainGoals"
                            render={() => (
                                <FormItem>
                                    <FormLabel className="text-base">What are your main goals for the next month?</FormLabel>
                                    {goals.map((item) => (
                                        <FormField
                                            key={item.id}
                                            control={form.control}
                                            name="mainGoals"
                                            render={({ field }) => (
                                                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                                    <FormControl>
                                                        <Checkbox
                                                            checked={field.value?.includes(item.id)}
                                                            onCheckedChange={(checked) => {
                                                                return checked
                                                                    ? field.onChange([...field.value, item.id])
                                                                    : field.onChange(field.value?.filter((value) => value !== item.id));
                                                            }}
                                                        />
                                                    </FormControl>
                                                    <FormLabel className="font-normal">{item.label}</FormLabel>
                                                </FormItem>
                                            )}
                                        />
                                    ))}
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Separator />
                        <FormField
                            control={form.control}
                            name="priorities"
                            render={() => (
                                <FormItem>
                                    <FormLabel className="text-base">What are your main life priorities right now?</FormLabel>
                                     {priorities.map((item) => (
                                        <FormField
                                            key={item.id}
                                            control={form.control}
                                            name="priorities"
                                            render={({ field }) => (
                                                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                                    <FormControl>
                                                        <Checkbox
                                                            checked={field.value?.includes(item.id)}
                                                            onCheckedChange={(checked) => {
                                                                return checked
                                                                    ? field.onChange([...field.value, item.id])
                                                                    : field.onChange(field.value?.filter((value) => value !== item.id));
                                                            }}
                                                        />
                                                    </FormControl>
                                                    <FormLabel className="font-normal">{item.label}</FormLabel>
                                                </FormItem>
                                            )}
                                        />
                                    ))}
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Separator />
                        <FormField
                            control={form.control}
                            name="sleepHours"
                            render={({ field }) => (
                                <FormItem className="space-y-3">
                                    <FormLabel className="text-base">How many hours of sleep do you need per night?</FormLabel>
                                    <FormControl>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <SelectTrigger><SelectValue/></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="6">6 hours</SelectItem>
                                                <SelectItem value="7">7 hours</SelectItem>
                                                <SelectItem value="8">8 hours</SelectItem>
                                                <SelectItem value="9">9 hours</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Separator />
                        <FormField
                            control={form.control}
                            name="energyPeak"
                            render={({ field }) => (
                                <FormItem className="space-y-3">
                                    <FormLabel className="text-base">When are your energy levels at their peak?</FormLabel>
                                    <FormControl>
                                        <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-col space-y-1">
                                            <FormItem className="flex items-center space-x-3 space-y-0">
                                                <FormControl><RadioGroupItem value="morning" /></FormControl>
                                                <FormLabel className="font-normal">Morning (8 AM - 12 PM)</FormLabel>
                                            </FormItem>
                                            <FormItem className="flex items-center space-x-3 space-y-0">
                                                <FormControl><RadioGroupItem value="afternoon" /></FormControl>
                                                <FormLabel className="font-normal">Afternoon (1 PM - 5 PM)</FormLabel>
                                            </FormItem>
                                            <FormItem className="flex items-center space-x-3 space-y-0">
                                                <FormControl><RadioGroupItem value="evening" /></FormControl>
                                                <FormLabel className="font-normal">Evening (6 PM - 10 PM)</FormLabel>
                                            </FormItem>
                                        </RadioGroup>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <Separator />
                        <FormField
                            control={form.control}
                            name="pastObstacles"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-base">What are your biggest time-wasters or obstacles?</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="e.g., Social media, procrastination, too many meetings..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
};
