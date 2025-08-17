
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
  
  const parseGoalsWithDates = (key: string, value: any) => {
    if ((key === 'dueDate' || key.endsWith('Date')) && value) {
      return new Date(value);
    }
    if (key === 'subGoals' && Array.isArray(value)) {
       return value.map(subGoal => {
           const newSubGoal = {...subGoal};
           if (newSubGoal.dueDate) {
               newSubGoal.dueDate = new Date(newSubGoal.dueDate);
           }
           return newSubGoal;
       })
    }
    return value;
  }

  useEffect(() => {
    // Load initial goals
    if (user && goals.length === 0) {
       const storedGoals = sessionStorage.getItem('goals');
       if (storedGoals) {
         setGoals(JSON.parse(storedGoals, parseGoalsWithDates));
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
      const newGoals: Goal[] = JSON.parse(newGoalsParam);
      if (newGoals && Array.isArray(newGoals) && newGoals.length > 0) {
        const goalsToAdd = newGoals.filter(newGoal => !goals.some(existingGoal => existingGoal.id === newGoal.id));
        if (goalsToAdd.length > 0) {
          const updatedGoals = [...goals, ...goalsToAdd.map((g: any) => ({ ...g, dueDate: g.dueDate ? new Date(g.dueDate) : undefined }))];
          setGoals(updatedGoals);
          sessionStorage.setItem('goals', JSON.stringify(updatedGoals));
        }
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
    setGoals((prevGoals) => {
        const newGoals = prevGoals.map(g => {
            if (g.id === updatedGoal.id) {
                return updatedGoal;
            }
            if (g.subGoals) {
                const newSubGoals = g.subGoals.map(sg => sg.id === updatedGoal.id ? updatedGoal : sg);
                return {...g, subGoals: newSubGoals};
            }
            return g;
        });

        const goalExists = newGoals.some(g => g.id === updatedGoal.id);
        if (!goalExists) {
            const parentGoal = newGoals.find(g => g.subGoals?.some(sg => sg.id === updatedGoal.id));
            if (parentGoal) {
                 return newGoals.map(g => g.id === parentGoal.id ? { ...g, subGoals: g.subGoals!.map(sg => sg.id === updatedGoal.id ? updatedGoal : sg)} : g);
            }
        }
        
        return newGoals;
    });
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
    <>
      <AppHeader allGoals={goals} />
      <main className="flex-1 overflow-x-auto p-4 sm:p-0">
        <KanbanBoard 
          columns={columns} 
          onGoalUpdate={handleGoalUpdate}
          onGoalDelete={handleGoalDelete}
        />
      </main>
    </>
  );
}
