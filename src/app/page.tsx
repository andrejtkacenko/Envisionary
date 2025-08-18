
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Goal, GoalStatus } from '@/types';
import { AppHeader } from '@/components/app-header';
import { KanbanBoard } from '@/components/kanban-board';
import { KANBAN_COLUMNS } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { getGoals, addGoal, addGoals, updateGoal, deleteGoal } from '@/lib/goals-service';
import { Loader2, Target, Plus, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

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
} from '@dnd-kit/core';
import { arrayMove, SortableContext } from '@dnd-kit/sortable';
import { KanbanCard } from '@/components/kanban-card';

export default function Home() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [activeGoal, setActiveGoal] = useState<Goal | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const fetchGoals = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const userGoals = await getGoals(user.uid);
      setGoals(userGoals);
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
      fetchGoals();
    }
  }, [user, fetchGoals]);

  const handleAddNewGoal = useCallback(async (newGoalData: Omit<Goal, 'id' | 'subGoals'>) => {
    if (!user) return;
    try {
        const newGoal = await addGoal(user.uid, newGoalData);
        setGoals(prev => [...prev, newGoal]);
        return newGoal;
    } catch(e) {
        console.error("Error adding goal:", e);
    }
  }, [user]);

  const handleAddNewGoals = useCallback(async (newGoalsData: Omit<Goal, 'id' | 'subGoals'>[]) => {
      if (!user) return;
      try {
        const newGoals = await addGoals(user.uid, newGoalsData);
        setGoals(prev => [...prev, ...newGoals]);
        return newGoals;
      } catch (e) {
        console.error("Error adding goals:", e);
      }
  }, [user]);

  useEffect(() => {
    const hasNewGoals = searchParams.get('newGoal') || searchParams.get('newGoals');
    if (hasNewGoals) {
      fetchGoals();
      router.replace('/', { scroll: false });
    }
  }, [searchParams, fetchGoals, router]);

  const handleGoalUpdate = async (updatedGoal: Goal) => {
    if (!user) return;
    try {
      setGoals((prevGoals) => {
          return prevGoals.map(g => g.id === updatedGoal.id ? updatedGoal : g);
      });
      await updateGoal(user.uid, updatedGoal);
    } catch (e) {
      console.error("Error updating goal:", e);
    }
  };
  
  const handleGoalDelete = async (goalId: string) => {
    if (!user) return;
    try {
      await deleteGoal(user.uid, goalId);
      setGoals((prev) => prev.filter((goal) => goal.id !== goalId));
    } catch (e) {
      console.error("Error deleting goal:", e);
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
    if (!over) return;
  
    const activeId = active.id as string;
    const overId = over.id as string;
  
    // Check if we are over a column or a card
    const isActiveGoal = active.data.current?.type === 'Goal';
    const isOverGoal = over.data.current?.type === 'Goal';
    const isOverColumn = over.data.current?.type === 'Column';

    if (!isActiveGoal) return;
  
    setGoals(currentGoals => {
      const activeIndex = currentGoals.findIndex(g => g.id === activeId);
      if (activeIndex === -1) return currentGoals;
  
      let newGoals = [...currentGoals];
      const activeGoal = newGoals[activeIndex];
  
      if (isOverGoal) {
        const overIndex = newGoals.findIndex(g => g.id === overId);
        if (overIndex !== -1) {
          const overGoal = newGoals[overIndex];
          if (activeGoal.status !== overGoal.status) {
            newGoals[activeIndex] = { ...activeGoal, status: overGoal.status };
            newGoals = arrayMove(newGoals, activeIndex, overIndex);
          } else if (activeIndex !== overIndex) {
            newGoals = arrayMove(newGoals, activeIndex, overIndex);
          }
        }
      } else if (isOverColumn) {
        const overColumnId = overId as GoalStatus;
        if (activeGoal.status !== overColumnId) {
           newGoals[activeIndex] = { ...activeGoal, status: overColumnId };
        }
      }
      return newGoals;
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveGoal(null);
    const { active, over } = event;
    if (!over) return;

    const activeGoalId = active.id as string;
    const finalGoal = goals.find(g => g.id === activeGoalId);

    if (finalGoal && user) {
        // Find the original state of the goal before drag started to check for changes
        const originalGoal = goalsMap[activeGoalId];
        if (originalGoal && (originalGoal.status !== finalGoal.status || originalGoal.id !== finalGoal.id)) {
            updateGoal(user.uid, finalGoal).catch(e => {
                console.error("Failed to save goal update:", e);
                // Optionally revert state on failure
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
    >
        <div className="flex flex-col h-screen">
        <AppHeader allGoals={goals} />
        <main className="flex-1 overflow-x-auto p-4">
            {isLoading ? (
            <div className="flex h-full w-full items-center justify-center py-24">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
            ) : goals.length === 0 ? (
                 <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
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
