
"use client"

import type { Goal } from "@/types";
import { KanbanCard } from "@/components/kanban-card";

interface KanbanColumnProps {
  column: {
    id: string;
    title: string;
    goals: Goal[];
  };
  onGoalUpdate: (goal: Goal) => void;
  onGoalDelete: (goalId: string) => void;
}

export function KanbanColumn({ column, onGoalUpdate, onGoalDelete }: KanbanColumnProps) {
  return (
    <div className="flex flex-col w-full sm:w-80 sm:min-w-80">
      <div className="flex items-center justify-between mb-4 px-1">
        <h2 className="text-xl font-headline font-semibold">{column.title}</h2>
        <span className="text-sm font-medium bg-muted text-muted-foreground rounded-full px-3 py-1">
          {column.goals.length}
        </span>
      </div>
      <div className="flex flex-col gap-4 h-full sm:overflow-y-auto sm:pr-2">
        {column.goals.map((goal) => (
          <KanbanCard 
            key={goal.id} 
            goal={goal} 
            onGoalUpdate={onGoalUpdate}
            onGoalDelete={onGoalDelete}
          />
        ))}
      </div>
    </div>
  );
}
