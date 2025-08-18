
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
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
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
