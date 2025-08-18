
"use client"

import type { Goal } from "@/types";
import { KanbanColumn } from "@/components/kanban-column";

interface KanbanBoardProps {
  columns: {
    id: string;
    title: string;
    goals: Goal[];
  }[];
  onGoalUpdate: (goal: Goal) => void;
  onGoalDelete: (goalId: string) => void;
}

export function KanbanBoard({ columns, onGoalUpdate, onGoalDelete }: KanbanBoardProps) {
  return (
    <div className="flex gap-6 h-full items-start">
      {columns.map((col) => (
        <KanbanColumn
          key={col.id}
          column={col}
          onGoalUpdate={onGoalUpdate}
          onGoalDelete={onGoalDelete}
        />
      ))}
    </div>
  );
}
