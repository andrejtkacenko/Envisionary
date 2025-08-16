"use client"

import type { Task } from "@/types";
import { KanbanCard } from "@/components/kanban-card";

interface KanbanColumnProps {
  column: {
    id: string;
    title: string;
    tasks: Task[];
  };
  onTaskUpdate: (task: Task) => void;
  onTaskDelete: (taskId: string) => void;
}

export function KanbanColumn({ column, onTaskUpdate, onTaskDelete }: KanbanColumnProps) {
  return (
    <div className="flex flex-col w-80 min-w-80">
      <div className="flex items-center justify-between mb-4 px-1">
        <h2 className="text-xl font-headline font-semibold">{column.title}</h2>
        <span className="text-sm font-medium bg-muted text-muted-foreground rounded-full px-3 py-1">
          {column.tasks.length}
        </span>
      </div>
      <div className="flex flex-col gap-4 overflow-y-auto h-full pr-2">
        {column.tasks.map((task) => (
          <KanbanCard 
            key={task.id} 
            task={task} 
            onTaskUpdate={onTaskUpdate}
            onTaskDelete={onTaskDelete}
          />
        ))}
      </div>
    </div>
  );
}
