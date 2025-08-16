"use client"

import type { Task } from "@/types";
import { KanbanColumn } from "@/components/kanban-column";

interface KanbanBoardProps {
  columns: {
    id: string;
    title: string;
    tasks: Task[];
  }[];
  onTaskUpdate: (task: Task) => void;
  onTaskDelete: (taskId: string) => void;
}

export function KanbanBoard({ columns, onTaskUpdate, onTaskDelete }: KanbanBoardProps) {
  return (
    <div className="flex-1 px-4 py-6 md:px-8">
      <div className="flex gap-6 h-full overflow-x-auto">
        {columns.map((col) => (
          <KanbanColumn
            key={col.id}
            column={col}
            onTaskUpdate={onTaskUpdate}
            onTaskDelete={onTaskDelete}
          />
        ))}
      </div>
    </div>
  );
}
