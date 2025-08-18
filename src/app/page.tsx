
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Goal, GoalStatus } from '@/types';
import { AppHeader } from '@/components/app-header';
import { KanbanBoard } from '@/components/kanban-board';
import { KANBAN_COLUMNS } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { getGoals, addGoal, addGoals, updateGoal, deleteGoal } from '@/lib/goals-service';
import { Loader2, Target, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';

export default function Home() {
  const [goals, setGoals] = useState<Goal[]>([]);
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
    const allSubGoalIds = new Set<string>();
    goals.forEach(g => {
        g.subGoals?.forEach(sg => {
            allSubGoalIds.add(sg.id);
        });
    });
    const topLevelGoals = goals.filter(goal => !allSubGoalIds.has(goal.id));
    return KANBAN_COLUMNS.map(col => ({
        ...col,
        goals: topLevelGoals.filter(goal => goal.status === col.id),
    }));
  }, [goals]);

  const sensors = useSensors(useSensor(PointerSensor, {
    activationConstraint: {
      distance: 8,
    },
  }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) return;

    const activeGoalId = active.id as string;
    const overId = over.id as string;
    
    setGoals((currentGoals) => {
      const activeGoalIndex = currentGoals.findIndex((g) => g.id === activeGoalId);
      if (activeGoalIndex === -1) {
        return currentGoals; // Should not happen
      }
      
      const activeGoal = currentGoals[activeGoalIndex];
      let newGoals = [...currentGoals];

      // Check if we dropped over a column (droppable container)
      const isOverColumn = KANBAN_COLUMNS.some(c => c.id === overId);
      if (isOverColumn) {
          const newStatus = overId as GoalStatus;
          if (activeGoal.status !== newStatus) {
              newGoals[activeGoalIndex] = { ...activeGoal, status: newStatus };
          }
      } else { // Dropped over another goal card
          const overGoalIndex = newGoals.findIndex((g) => g.id === overId);
          if (overGoalIndex !== -1) {
              const overGoal = newGoals[overGoalIndex];
              // Move card within or between columns
              newGoals = arrayMove(newGoals, activeGoalIndex, overGoalIndex);
              // Update status if column is different
              if (activeGoal.status !== overGoal.status) {
                  const movedGoalIndex = newGoals.findIndex(g => g.id === activeGoalId);
                  newGoals[movedGoalIndex] = { ...newGoals[movedGoalIndex], status: overGoal.status };
              }
          }
      }
      
      // Persist the final state change
      const finalChangedGoal = newGoals.find(g => g.id === activeGoalId);
      if (finalChangedGoal && user) {
        // Use a different variable to avoid issues with closure in async operations
        const goalToUpdate = {...finalChangedGoal};
        updateGoal(user.uid, goalToUpdate).catch(e => console.error("Failed to save goal update:", e));
      }
      
      return newGoals;
    });
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
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
        <div className="flex flex-col">
        <AppHeader allGoals={goals} />
        <main className="flex-1 p-4">
            {isLoading ? (
            <div className="flex h-full w-full items-center justify-center py-24">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
            ) : goals.length === 0 ? (
                 <div className="flex flex-col items-center justify-center h-[calc(100vh-10rem)] gap-4 text-center">
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
    </DndContext>
  );
}
