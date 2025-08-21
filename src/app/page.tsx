
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Goal, GoalStatus } from '@/types';
import { AppHeader } from '@/components/app-header';
import { KanbanBoard } from '@/components/kanban-board';
import { KANBAN_COLUMNS } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { getGoals, addGoal, addGoals, updateGoal, deleteGoal, addNotification } from '@/lib/goals-service';
import { Loader2, Target, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverEvent,
  DragOverlay,
  rectIntersection,
} from '@dnd-kit/core';
import { SortableContext, arrayMove } from '@dnd-kit/sortable';
import { KanbanCard } from '@/components/kanban-card';

export default function Home() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [activeGoal, setActiveGoal] = useState<Goal | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const fetchGoals = useCallback(async () => {
    // This function can be used for one-time fetches if needed elsewhere
    if (!user) return;
    setIsLoading(true);
    try {
      // Switched to getGoalsSnapshot to avoid real-time issues in this context if any
      const userGoals = await getGoals(user.uid, () => {}, () => {});
    } catch (error) {
      console.error("Error fetching goals:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      setIsLoading(true);
      // Set up the real-time listener
      const unsubscribe = getGoals(user.uid, (userGoals) => {
        setGoals(userGoals.filter(g => g.status !== 'ongoing'));
        setIsLoading(false);
      }, (error) => {
        console.error("Error fetching real-time goals:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not fetch goals." });
        setIsLoading(false);
      });

      // Cleanup subscription on component unmount
      return () => unsubscribe();
    }
  }, [user, toast]);


  const handleAddNewGoal = useCallback(async (newGoalData: Omit<Goal, 'id' | 'subGoals'>) => {
    if (!user) return;
    try {
        const newGoal = await addGoal(user.uid, newGoalData);
        // setGoals(prev => [...prev, newGoal]); // No longer needed with real-time listener
        return newGoal;
    } catch(e) {
        console.error("Error adding goal:", e);
    }
  }, [user]);

  const handleAddNewGoals = useCallback(async (newGoalsData: Omit<Goal, 'id' | 'subGoals'>[]) => {
      if (!user) return;
      try {
        const newGoals = await addGoals(user.uid, newGoalsData);
        // setGoals(prev => [...prev, ...newGoals]); // No longer needed with real-time listener
        return newGoals;
      } catch (e) {
        console.error("Error adding goals:", e);
      }
  }, [user]);

  useEffect(() => {
    const hasNewGoals = searchParams.get('newGoal') || searchParams.get('newGoals');
    if (hasNewGoals) {
      router.replace('/', { scroll: false });
    }
  }, [searchParams, router]);

  const handleGoalUpdate = async (updatedGoal: Goal) => {
    if (!user) return;
    
    // Optimistic UI update
    const originalGoals = goals;
    setGoals((prevGoals) => {
        return prevGoals.map(g => g.id === updatedGoal.id ? updatedGoal : g);
    });

    try {
      await updateGoal(user.uid, updatedGoal);
       if (updatedGoal.status === 'done') {
        await addNotification(user.uid, {
          userId: user.uid,
          title: 'Goal Completed!',
          description: `You've completed the goal: "${updatedGoal.title}"`,
          type: 'info',
        });
      }
    } catch (e) {
      console.error("Error updating goal:", e);
      // Revert state on failure
      toast({
          variant: "destructive",
          title: "Update Failed",
          description: "Could not save your changes. Please try again.",
      });
      setGoals(originalGoals); // Revert
    }
  };
  
  const handleGoalDelete = async (goalId: string) => {
    if (!user) return;

    // Optimistic UI update
    const originalGoals = goals;
    setGoals((prev) => prev.filter((goal) => goal.id !== goalId));

    try {
      await deleteGoal(user.uid, goalId);
    } catch (e) {
      console.error("Error deleting goal:", e);
       toast({
          variant: "destructive",
          title: "Delete Failed",
          description: "Could not delete the goal. Please try again.",
      });
      setGoals(originalGoals); // Revert
    }
  }

  const columns = useMemo(() => {
    return KANBAN_COLUMNS.map(col => ({
        ...col,
        goals: goals.filter(goal => goal.status === col.id),
    }));
  }, [goals]);

  const sensors = useSensors(useSensor(PointerSensor, {
    activationConstraint: {
      distance: 8,
    },
  }));
  
  const goalsMap = useMemo(() => {
    return goals.reduce((acc, goal) => {
      acc[goal.id] = goal;
      return acc;
    }, {} as Record<string, Goal>);
  }, [goals]);
  
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const goal = goalsMap[active.id as string];
    if (goal) {
      setActiveGoal(goal);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over || !activeGoal) return;
  
    const activeId = active.id as string;
    const overId = over.id as string;
  
    const isActiveAGoal = active.data.current?.type === 'Goal';
    const isOverAColumn = over.data.current?.type === 'Column';

    // Handle dropping a Goal over a Column
    if (isActiveAGoal && isOverAColumn) {
        const activeGoalStatus = active.data.current?.goal.status;
        const overColumnId = overId as GoalStatus;
        if (activeGoalStatus !== overColumnId) {
            setGoals(currentGoals => {
                const activeIndex = currentGoals.findIndex(g => g.id === activeId);
                if (activeIndex !== -1) {
                    currentGoals[activeIndex].status = overColumnId;
                    return arrayMove(currentGoals, activeIndex, activeIndex);
                }
                return currentGoals;
            });
        }
    }
    
    const isOverAGoal = over.data.current?.type === 'Goal';

    // Handle dropping a Goal over another Goal (sorting)
    if (isActiveAGoal && isOverAGoal) {
        const activeGoalStatus = active.data.current?.goal.status;
        const overGoalStatus = over.data.current?.goal.status;
        
        if (activeGoalStatus === overGoalStatus) {
            const oldIndex = goals.findIndex(g => g.id === activeId);
            const newIndex = goals.findIndex(g => g.id === overId);
            if (oldIndex !== newIndex) {
                 setGoals(currentGoals => arrayMove(currentGoals, oldIndex, newIndex));
            }
        } else {
             // Handle moving to a different column by dropping on a card
             setGoals(currentGoals => {
                const activeIndex = currentGoals.findIndex(g => g.id === activeId);
                let newIndex = currentGoals.findIndex(g => g.id === overId);
                if (activeIndex !== -1) {
                    currentGoals[activeIndex].status = overGoalStatus;
                    return arrayMove(currentGoals, activeIndex, newIndex);
                }
                return currentGoals;
            });
        }
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveGoal(null);
    const { active, over } = event;
    if (!over || !user) return;

    const activeGoalId = active.id as string;
    const updatedGoal = goals.find(g => g.id === activeGoalId);
    
    // Find the original state of the goal before drag started
    const originalGoal = goalsMap[activeGoalId];

    if (updatedGoal && originalGoal) {
        // Only trigger update if status or position actually changed
        const originalIndex = Object.values(goalsMap).findIndex(g => g.id === activeGoalId)
        const newIndex = goals.findIndex(g => g.id === activeGoalId)

        if (originalGoal.status !== updatedGoal.status || originalIndex !== newIndex) {
            handleGoalUpdate(updatedGoal).catch(e => {
                console.error("Failed to save goal update:", e);
                toast({
                    variant: "destructive",
                    title: "Save Failed",
                    description: "Your changes could not be saved. Reverting.",
                });
                setGoals(Object.values(goalsMap)); // Revert on failure
            });
        }
    }
  };


  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen w-full flex-col bg-background items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      collisionDetection={rectIntersection}
    >
        <div className="flex flex-col h-screen">
            <AppHeader allGoals={goals} />
            <main className="flex-1 p-4 md:p-6 overflow-x-auto">
                {isLoading ? (
                <div className="flex w-full items-center justify-center py-24">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
                ) : goals.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[calc(100vh-15rem)] gap-4 text-center rounded-lg border bg-card">
                        <Target className="h-16 w-16 text-muted-foreground" />
                        <h2 className="text-2xl font-semibold">Your Board is Empty</h2>
                        <p className="text-muted-foreground max-w-sm">
                            Create your first goal to get started on your journey to productivity.
                        </p>
                        <Button asChild>
                            <Link href="/create-goal">
                                <Plus className="mr-2 h-4 w-4" /> Create New Goal
                            </Link>
                        </Button>
                    </div>
                ) : (
                <KanbanBoard 
                    columns={columns} 
                    onGoalUpdate={handleGoalUpdate}
                    onGoalDelete={handleGoalDelete}
                />
                )}
            </main>
        </div>
        <DragOverlay>
            {activeGoal ? (
                <KanbanCard goal={activeGoal} isOverlay />
            ) : null}
        </DragOverlay>
    </DndContext>
  );
}
