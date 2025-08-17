"use client";

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Goal, GoalStatus } from '@/types';
import { mockTasks } from '@/lib/mock-data';
import { AppHeader } from '@/components/app-header';
import { KanbanBoard } from '@/components/kanban-board';
import { KANBAN_COLUMNS } from '@/types';
import { useAuth } from '@/context/AuthContext';

export default function Home() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    // Load initial goals
    if (user && goals.length === 0) {
       const storedGoals = sessionStorage.getItem('goals');
       if (storedGoals) {
         setGoals(JSON.parse(storedGoals, (key, value) => {
          if (key === 'dueDate' && value) {
            return new Date(value);
          }
          return value;
         }));
       } else {
         setGoals(mockTasks);
       }
    }

    const newGoalParam = searchParams.get('newGoal');
    if (newGoalParam) {
      const newGoal = JSON.parse(newGoalParam);
      if (newGoal && !goals.find(g => g.id === newGoal.id)) {
        const updatedGoals = [...goals, { ...newGoal, dueDate: newGoal.dueDate ? new Date(newGoal.dueDate) : undefined }];
        setGoals(updatedGoals);
        sessionStorage.setItem('goals', JSON.stringify(updatedGoals));
        // Remove the query param from the URL
        router.replace('/', { scroll: false });
      }
    }
     const newGoalsParam = searchParams.get('newGoals');
    if (newGoalsParam) {
      const newGoals = JSON.parse(newGoalsParam);
      if (newGoals && Array.isArray(newGoals) && newGoals.length > 0) {
        const updatedGoals = [...goals, ...newGoals.map((g: any) => ({ ...g, dueDate: g.dueDate ? new Date(g.dueDate) : undefined }))];
        setGoals(updatedGoals);
        sessionStorage.setItem('goals', JSON.stringify(updatedGoals));
        router.replace('/', { scroll: false });
      }
    }
  }, [user, searchParams, router, goals]);

  useEffect(() => {
    if (goals.length > 0) {
      sessionStorage.setItem('goals', JSON.stringify(goals));
    }
  }, [goals]);

  const handleGoalUpdate = (updatedGoal: Goal) => {
    setGoals((prev) =>
      prev.map((goal) => (goal.id === updatedGoal.id ? updatedGoal : goal))
    );
  };
  
  const handleGoalDelete = (goalId: string) => {
    setGoals((prev) => prev.filter((goal) => goal.id !== goalId));
  }

  const columns = useMemo(() => {
    return KANBAN_COLUMNS.map(col => ({
      ...col,
      goals: goals.filter(goal => goal.status === col.id),
    }))
  }, [goals]);

  if (loading || !user) {
    return <div className="flex min-h-screen w-full flex-col bg-background items-center justify-center"><p>Loading...</p></div>;
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-background font-body">
      <AppHeader allGoals={goals} />
      <main className="flex-1 overflow-x-auto">
        <KanbanBoard 
          columns={columns} 
          onGoalUpdate={handleGoalUpdate}
          onGoalDelete={handleGoalDelete}
        />
      </main>
    </div>
  );
}
