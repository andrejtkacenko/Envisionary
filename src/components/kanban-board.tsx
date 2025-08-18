
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
    <div className="flex flex-col sm:flex-row gap-6">
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
