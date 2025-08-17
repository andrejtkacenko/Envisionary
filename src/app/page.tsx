"use client";

import { useState, useEffect, useMemo } from 'react';
import type { Task, TaskStatus } from '@/types';
import { mockTasks } from '@/lib/mock-data';
import { AppHeader } from '@/components/app-header';
import { KanbanBoard } from '@/components/kanban-board';
import { Button } from '@/components/ui/button';
import { KANBAN_COLUMNS } from '@/types';

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // Load mock data on the client to avoid hydration mismatch
    setTasks(mockTasks);
    setIsClient(true);
  }, []);

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

  if (!isClient) {
    // Render nothing or a loading skeleton on the server
    return null;
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-background font-body">
      <Button>Sign Up</Button>
      <Button>Login</Button>
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
