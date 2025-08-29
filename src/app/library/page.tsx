
"use client";

import { usePathname } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Library, Calendar, Target } from 'lucide-react';
import Link from 'next/link';

import GoalLibraryPage from './goals/page';
import ScheduleLibraryPage from './schedules/page';

export default function LibraryPage() {
    const pathname = usePathname();
    const activeTab = pathname.includes('schedules') ? 'schedules' : 'goals';
    
    return (
        <div className="flex-1 space-y-8 p-4 md:p-8 pt-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
                        <Library /> Template Library
                    </h1>
                    <p className="text-muted-foreground">
                        Browse and import goals and schedule templates.
                    </p>
                </div>
            </div>

            <Tabs value={activeTab} className="w-full">
                <TabsList className="grid w-full max-w-md grid-cols-2">
                    <TabsTrigger value="goals" asChild>
                        <Link href="/library/goals"><Target className="mr-2 h-4 w-4"/> Goal Templates</Link>
                    </TabsTrigger>
                    <TabsTrigger value="schedules" asChild>
                         <Link href="/library/schedules"><Calendar className="mr-2 h-4 w-4"/> Schedule Templates</Link>
                    </TabsTrigger>
                </TabsList>
                <TabsContent value="goals" className="mt-6">
                    <GoalLibraryPage />
                </TabsContent>
                <TabsContent value="schedules" className="mt-6">
                    <ScheduleLibraryPage />
                </TabsContent>
            </Tabs>
        </div>
    );
}
