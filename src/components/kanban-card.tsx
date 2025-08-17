"use client"

import { ArrowDown, ArrowRight, ArrowUp, Calendar as CalendarIcon, MoreHorizontal, Trash, Edit, Wand2 } from "lucide-react";
import { format } from "date-fns";

import type { Goal, GoalPriority } from "@/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { GoalDialog } from "@/components/goal-dialog";
import { BreakDownGoalDialog } from "@/components/break-down-goal-dialog";

interface KanbanCardProps {
  goal: Goal;
  onGoalUpdate: (goal: Goal) => void;
  onGoalDelete: (goalId: string) => void;
}

const priorityIcons: Record<GoalPriority, React.ReactNode> = {
  high: <ArrowUp className="h-4 w-4 text-destructive" />,
  medium: <ArrowRight className="h-4 w-4 text-yellow-500" />,
  low: <ArrowDown className="h-4 w-4 text-green-500" />,
};

const priorityTooltips: Record<GoalPriority, string> = {
  high: 'High Priority',
  medium: 'Medium Priority',
  low: 'Low Priority'
}

export function KanbanCard({ goal, onGoalUpdate, onGoalDelete }: KanbanCardProps) {
  return (
    <Card className="hover:shadow-lg transition-shadow duration-200">
      <CardHeader className="p-4 pb-2">
        <div className="flex items-start justify-between">
          <Badge variant="secondary">{goal.project}</Badge>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <GoalDialog 
                      goal={goal} 
                      onSave={(updatedGoal) => onGoalUpdate({ ...updatedGoal, id: goal.id })}
                      triggerButton={
                        <button className="w-full text-left flex items-center">
                          <Edit className="mr-2 h-4 w-4" />
                          <span>Edit</span>
                        </button>
                      } 
                    />
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <BreakDownGoalDialog goal={goal}>
                        <button className="w-full text-left flex items-center">
                            <Wand2 className="mr-2 h-4 w-4" />
                            <span>Break down goal</span>
                        </button>
                    </BreakDownGoalDialog>
                </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onGoalDelete(goal.id)} className="text-destructive">
                <Trash className="mr-2 h-4 w-4" />
                <span>Delete</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <CardTitle className="text-base font-medium pt-2">{goal.title}</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          {goal.dueDate && (
            <div className="flex items-center gap-1">
              <CalendarIcon className="h-4 w-4" />
              <span>{format(goal.dueDate, "MMM d")}</span>
            </div>
          )}
          <div className="flex items-center" title={priorityTooltips[goal.priority]}>
            {priorityIcons[goal.priority]}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
