"use client";

import { useState, useEffect, useMemo } from 'react';
import type { Task, TaskStatus } from '@/types';
import { mockTasks } from '@/lib/mock-data';
import { AppHeader } from '@/components/app-header';
import { KanbanBoard } from '@/components/kanban-board';
import { Button } from '@/components/ui/button';
import { KANBAN_COLUMNS } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      setTasks(mockTasks);
    }
  }, [user]);

  const handleTaskCreate = (task: Omit<Task, 'id'>) => {
    const newTask = { ...task, id: crypto.randomUUID() };
    setTasks((prev) => [...prev, newTask]);
  };

  const handleTaskUpdate = (updatedTask: Task) => {
    setTasks((prev) =>
      prev.map((task) => (task.id === updatedTask.id ? updatedTask : task))
    );
  };
  
  const handleTaskDelete = (taskId: string) => {
    setTasks((prev) => prev.filter((task) => task.id !== taskId));
  }

  const columns = useMemo(() => {
    return KANBAN_COLUMNS.map(col => ({
      ...col,
      tasks: tasks.filter(task => task.status === col.id),
    }))
  }, [tasks]);

  if (loading || !user) {
    return <div className="flex min-h-screen w-full flex-col bg-background items-center justify-center"><p>Loading...</p></div>;
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-background font-body">
      <AppHeader allTasks={tasks} onTaskCreate={handleTaskCreate} />
      <main className="flex-1 overflow-x-auto">
        <KanbanBoard 
          columns={columns} 
          onTaskUpdate={handleTaskUpdate}
          onTaskDelete={handleTaskDelete}
        />
      </main>
    </div>
  );
}
