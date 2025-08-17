
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

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      const fetchGoals = async () => {
        setIsLoading(true);
        try {
          const userGoals = await getGoals(user.uid);
          setGoals(userGoals);
        } catch (error) {
          console.error("Error fetching goals:", error);
          // Handle error, e.g., show a toast notification
        } finally {
          setIsLoading(false);
        }
      };
      fetchGoals();
    }
  }, [user]);
  
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
    const newGoalParam = searchParams.get('newGoal');
    if (newGoalParam) {
      const newGoalData = JSON.parse(newGoalParam);
      // Ensure we don't add a goal that already exists from a previous render
      if (newGoalData && !goals.some(g => g.title === newGoalData.title && g.status === newGoalData.status)) {
        handleAddNewGoal(newGoalData);
        router.replace('/', { scroll: false });
      }
    }

    const newGoalsParam = searchParams.get('newGoals');
    if (newGoalsParam) {
        const newGoalsData = JSON.parse(newGoalsParam);
        if (newGoalsData && Array.isArray(newGoalsData) && newGoalsData.length > 0) {
            handleAddNewGoals(newGoalsData);
            router.replace('/', { scroll: false });
        }
    }

  }, [searchParams, router, goals, handleAddNewGoal, handleAddNewGoals]);


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
    <>
      <AppHeader allGoals={goals} />
      <main className="flex-1 overflow-x-auto p-4 sm:p-0">
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
    </>
  );
}
