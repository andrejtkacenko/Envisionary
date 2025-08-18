
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Goal } from '@/types';
import { AppHeader } from '@/components/app-header';
import { KanbanBoard } from '@/components/kanban-board';
import { KANBAN_COLUMNS } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { getGoals, addGoal, addGoals, updateGoal, deleteGoal } from '@/lib/goals-service';
import { Loader2 } from 'lucide-react';

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
      // New goal(s) were added, so we refetch from the database to ensure consistency
      fetchGoals();
      // Clean the URL
      router.replace('/', { scroll: false });
    }
  }, [searchParams, fetchGoals, router]);

  const handleGoalUpdate = async (updatedGoal: Goal) => {
    if (!user) return;
    try {
      await updateGoal(user.uid, updatedGoal);
      setGoals((prevGoals) => {
          return prevGoals.map(g => g.id === updatedGoal.id ? updatedGoal : g);
      });
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

  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen w-full flex-col bg-background items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen sm:h-auto">
      <AppHeader allGoals={goals} />
      <main className="flex-1 overflow-x-auto p-4">
        {isLoading ? (
           <div className="flex h-full w-full items-center justify-center">
             <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
  );
}
