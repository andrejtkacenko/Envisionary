

"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Goal, GoalStatus, AppUser } from '@/types';
import { AppHeader } from '@/components/app-header';
import { KanbanBoard } from '@/components/kanban-board';
import { KANBAN_COLUMNS } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { getGoals, addGoal, updateGoal, deleteGoal, addNotification } from '@/lib/goals-service';
import { Loader2, Target, Plus, Bot } from 'lucide-react';
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

// Add Telegram script to the window interface
declare global {
    interface Window {
        Telegram: any;
    }
}

export default function Home() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [activeGoal, setActiveGoal] = useState<Goal | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isTelegramAuth, setIsTelegramAuth] = useState(false);
  const [telegramStatus, setTelegramStatus] = useState("Loading...");
  const { user, appUser, loading: authLoading, signInWithToken } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const isTelegramFlow = searchParams.get('from') === 'telegram';

  // --- TELEGRAM MINI APP AUTH FLOW ---
  useEffect(() => {
    if (!isTelegramFlow) return;

    setIsTelegramAuth(true); // Show the Telegram loading UI
    const tg = window.Telegram?.WebApp;

    if (tg) {
      tg.ready();
      tg.MainButton.setText("Login to Envisionary");
      tg.MainButton.show();
      setTelegramStatus("Please press the button below to log in.");

      const mainButtonClickHandler = async () => {
        setTelegramStatus("Authenticating...");
        tg.MainButton.showProgress();

        const initData = tg.initData;

        try {
          const response = await fetch('/api/auth/telegram', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: initData,
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Authentication failed');
          }

          const { token } = await response.json();
          await signInWithToken(token);

          tg.MainButton.hide();
          router.replace('/');
          
        } catch (err: any) {
          console.error(err);
          setTelegramStatus(`Error: ${err.message}. Please try again.`);
          tg.MainButton.hideProgress();
        }
      };

      tg.onEvent('mainButtonClicked', mainButtonClickHandler);

      return () => {
        tg.offEvent('mainButtonClicked', mainButtonClickHandler);
        tg.MainButton.hide();
      };
    } else {
        setTelegramStatus("Telegram environment not detected. Please open via the bot.");
    }
  }, [isTelegramFlow, signInWithToken, router]);


  useEffect(() => {
    if (!isTelegramFlow && !authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router, isTelegramFlow]);

  const fetchGoals = useCallback(async (currentAppUser: AppUser) => {
    try {
      setIsLoading(true);
      const userGoals = await getGoals(currentAppUser.firebaseUid);
      setGoals(userGoals.filter(g => g.status !== 'ongoing'));
    } catch (error) {
      console.error("Error fetching goals:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not fetch goals." });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);
  
  useEffect(() => {
    if (appUser && !isTelegramFlow) {
      fetchGoals(appUser);
    }
  }, [appUser, isTelegramFlow, fetchGoals]);

  const handleGoalUpdate = async (updatedGoal: Goal) => {
    if (!appUser) return;
    
    const originalGoals = [...goals];
    setGoals((prevGoals) => prevGoals.map(g => g.id === updatedGoal.id ? updatedGoal : g));

    try {
      await updateGoal(updatedGoal);
       if (updatedGoal.status === 'done') {
        await addNotification({
          userId: appUser.id,
          title: 'Goal Completed!',
          description: `You've completed the goal: "${updatedGoal.title}"`,
          type: 'info',
        });
      }
    } catch (e) {
      console.error("Error updating goal:", e);
      toast({
          variant: "destructive",
          title: "Update Failed",
          description: "Could not save your changes. Please try again.",
      });
      setGoals(originalGoals);
    }
  };
  
  const handleGoalDelete = async (goalId: string) => {
    if (!appUser) return;

    const originalGoals = [...goals];
    setGoals((prev) => prev.filter((goal) => goal.id !== goalId));

    try {
      await deleteGoal(goalId);
    } catch (e) {
      console.error("Error deleting goal:", e);
       toast({
          variant: "destructive",
          title: "Delete Failed",
          description: "Could not delete the goal. Please try again.",
      });
      setGoals(originalGoals);
    }
  }

  const columns = useMemo(() => {
    return KANBAN_COLUMNS.map(col => ({
        ...col,
        goals: goals.filter(goal => goal.status === col.id && !goal.parentId),
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
    document.body.style.overflow = 'hidden';
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over || !activeGoal) return;
  
    const activeId = active.id as string;
    const overId = over.id as string;
  
    const isActiveAGoal = active.data.current?.type === 'Goal';
    const isOverAColumn = over.data.current?.type === 'Column';

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
    document.body.style.overflow = '';
    const { active, over } = event;
    if (!over || !appUser) return;

    const activeGoalId = active.id as string;
    const updatedGoal = goals.find(g => g.id === activeGoalId);
    
    const originalGoal = goalsMap[activeGoalId];

    if (updatedGoal && originalGoal) {
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
                setGoals(Object.values(goalsMap));
            });
        }
    }
  };

  if (isTelegramAuth && !appUser) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4">
            <div className="flex flex-col items-center gap-4 text-center">
                <Bot className="h-12 w-12" />
                <h1 className="text-xl font-semibold">Welcome to Envisionary</h1>
                <p className="text-muted-foreground">{telegramStatus}</p>
            </div>
        </div>
    );
  }

  if (authLoading || (!appUser && !isTelegramFlow)) {
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
                ) : goals.filter(g => !g.parentId).length === 0 ? (
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
