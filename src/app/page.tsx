"use client";

import { useState, useEffect, useMemo } from 'react';
import type { Goal, GoalStatus } from '@/types';
import { mockTasks } from '@/lib/mock-data';
import { AppHeader } from '@/components/app-header';
import { KanbanBoard } from '@/components/kanban-board';
import { Button } from '@/components/ui/button';
import { KANBAN_COLUMNS } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      setGoals(mockTasks);
    }
  }, [user]);

  const handleGoalCreate = (goal: Omit<Goal, 'id'>) => {
    const newGoal = { ...goal, id: crypto.randomUUID() };
    setGoals((prev) => [...prev, newGoal]);
  };

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
      <AppHeader allGoals={goals} onGoalCreate={handleGoalCreate} />
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
