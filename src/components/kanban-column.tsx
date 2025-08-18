
"use client"

import type { Goal, GoalStatus } from "@/types";
import { KanbanCard } from "@/components/kanban-card";
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { cn } from "@/lib/utils";
import { ScrollArea } from "./ui/scroll-area";

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
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: {
      type: 'Column',
      column,
    }
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between p-2 rounded-md bg-muted sticky top-0 z-10">
        <h2 className="text-lg font-headline font-semibold">{column.title}</h2>
        <span className="text-sm font-medium bg-background text-muted-foreground rounded-full px-3 py-1">
          {column.goals.length}
        </span>
      </div>
      <div
        ref={setNodeRef} 
        className={cn(
            "flex flex-col gap-4 rounded-lg p-1 min-h-[100px] transition-colors duration-200",
            isOver ? "bg-primary/10" : ""
        )}
      >
        <SortableContext items={column.goals.map(g => g.id)} strategy={verticalListSortingStrategy}>
            {column.goals.map((goal) => (
            <KanbanCard 
                key={goal.id} 
                goal={goal} 
                onGoalUpdate={onGoalUpdate}
                onGoalDelete={onGoalDelete}
            />
            ))}
        </SortableContext>
      </div>
    </div>
  );
}
