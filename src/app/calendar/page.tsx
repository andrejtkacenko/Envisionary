
"use client";

import { useState, useMemo } from 'react';
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
  isSameDay,
  isToday
} from 'date-fns';
import { ChevronLeft, ChevronRight, PlusCircle, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { DayScheduleDialog } from '@/components/day-schedule-dialog'; 

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const { user } = useAuth();
  // In a real app, you'd fetch events from your database
  const [events, setEvents] = useState<any[]>([]); 

  const firstDayOfMonth = startOfMonth(currentDate);
  const lastDayOfMonth = endOfMonth(currentDate);

  const daysInMonth = eachDayOfInterval({
    start: startOfWeek(firstDayOfMonth),
    end: endOfWeek(lastDayOfMonth),
  });

  const goToNextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const goToPreviousMonth = () => setCurrentDate(subMonths(currentDate, 1));

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const handleDayClick = (day: Date) => {
    setSelectedDate(day);
    setIsDialogOpen(true);
  };
  
  const hasEvent = (day: Date) => {
      // This is a placeholder. In a real app, you would check if a schedule
      // has been saved for this day in your database.
      return events.some(event => isSameDay(new Date(event.date), day));
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0">
            <div>
                <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
                    <CalendarIcon /> Calendar
                </h1>
                <p className="text-muted-foreground">
                    Plan your days, weeks, and months with AI assistance.
                </p>
            </div>
        </div>

        <div className="bg-card rounded-lg border p-2 sm:p-4">
            <div className="flex items-center justify-between mb-4">
                <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <h2 className="text-lg sm:text-xl font-semibold font-headline text-center">
                    {format(currentDate, 'MMMM yyyy')}
                </h2>
                <Button variant="outline" size="icon" onClick={goToNextMonth}>
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>

            <div className="grid grid-cols-7 text-center font-semibold text-xs sm:text-sm text-muted-foreground">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="py-2">{day}</div>
                ))}
            </div>

            <div className="grid grid-cols-7 grid-rows-5 gap-1">
                {daysInMonth.map((day, index) => (
                    <div
                        key={index}
                        onClick={() => handleDayClick(day)}
                        className={cn(
                            "relative flex flex-col h-20 sm:h-28 p-1 sm:p-2 border rounded-md cursor-pointer transition-colors hover:bg-muted/50",
                            format(day, 'M') !== format(currentDate, 'M') && "text-muted-foreground/50 bg-muted/20",
                            isToday(day) && "bg-primary/10 border-primary/50",
                            hasEvent(day) && "bg-accent/20"
                        )}
                    >
                        <span className={cn("text-xs sm:text-sm font-medium", isToday(day) && "text-primary")}>
                            {format(day, 'd')}
                        </span>
                         {hasEvent(day) && (
                            <div className="mt-1 flex-grow overflow-hidden">
                                <div className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-accent mx-auto"></div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
        
        {selectedDate && (
           <DayScheduleDialog
                isOpen={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                date={selectedDate}
            />
        )}
    </div>
  );
}
