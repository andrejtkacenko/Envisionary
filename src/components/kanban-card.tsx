
"use client"

import { useState } from "react";
import { ArrowDown, ArrowRight, ArrowUp, Calendar as CalendarIcon, MoreHorizontal, Trash, Edit, ChevronDown, Plus, Clock } from "lucide-react";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { EditGoalDialog } from "./edit-goal-dialog";
import { BreakDownGoalDialog, SubGoal } from "./break-down-goal-dialog";
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';


interface KanbanCardProps {
  goal: Goal;
  isOverlay?: boolean;
  onGoalUpdate?: (goal: Goal) => void;
  onGoalDelete?: (goalId: string) => void;
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

export function KanbanCard({ goal, isOverlay, onGoalUpdate, onGoalDelete }: KanbanCardProps) {
  const [isSubtasksOpen, setIsSubtasksOpen] = useState(false);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: goal.id,
    data: {
      type: 'Goal',
      goal,
    },
    disabled: !onGoalUpdate, // Disable sorting if no update function is passed
  });

  const style = {
    transition,
    transform: CSS.Transform.toString(transform),
  };

  const handleSubGoalChange = (subGoalId: string, checked: boolean) => {
      const updatedSubGoals = goal.subGoals?.map(sg => 
          sg.id === subGoalId ? { ...sg, status: checked ? 'done' : 'todo' } : sg
      );
      const updatedParentGoal = { ...goal, subGoals: updatedSubGoals };
      
      onGoalUpdate?.(updatedParentGoal);
  };
  
  const handleAddSubGoals = (newSubGoals: SubGoal[]) => {
     const newGoals: Goal[] = newSubGoals.map(sg => ({
        id: crypto.randomUUID(),
        title: sg.title,
        description: sg.description,
        project: goal.project,
        status: 'todo',
        priority: goal.priority,
        dueDate: goal.dueDate,
        estimatedTime: sg.estimatedTime,
      }));
      onGoalUpdate?.({...goal, subGoals: [...(goal.subGoals || []), ...newGoals]});
  }

  const completedSubGoals = goal.subGoals?.filter(sg => sg.status === 'done').length || 0;
  const totalSubGoals = goal.subGoals?.length || 0;
  const progress = totalSubGoals > 0 ? (completedSubGoals / totalSubGoals) * 100 : 0;
  
  const cardContent = (
    <Card 
        className={cn(
            "hover:shadow-md transition-shadow duration-200 flex flex-col bg-card/50 backdrop-blur-sm w-full sm:w-80",
            isDragging && "opacity-30",
            isOverlay && "shadow-lg scale-105"
        )}
    >
        <CardHeader className="p-4 pb-2">
            <div className="flex items-start justify-between">
                <Badge variant="secondary">{goal.project}</Badge>
                <div className="flex items-center" title={priorityTooltips[goal.priority]}>
                    {priorityIcons[goal.priority]}
                </div>
            </div>
            <CardTitle className="text-base font-medium pt-2">{goal.title}</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0 flex-grow space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {goal.dueDate && (
                    <div className="flex items-center gap-1">
                    <CalendarIcon className="h-4 w-4" />
                    <span>{format(goal.dueDate, "MMM d")}</span>
                    </div>
                )}
                {goal.estimatedTime && (
                    <Badge variant="outline" className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{goal.estimatedTime}</span>
                    </Badge>
                )}
            </div>
            
            {totalSubGoals > 0 && (
                <div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                        <span>Progress</span>
                        <span>{completedSubGoals}/{totalSubGoals}</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                </div>
            )}
        </CardContent>
    </Card>
  );

  if (isOverlay) {
    return cardContent;
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
        {onGoalUpdate && onGoalDelete ? (
            <EditGoalDialog
                goal={goal}
                onGoalUpdate={onGoalUpdate}
                onGoalDelete={onGoalDelete}
                trigger={cardContent}
            />
        ) : (
            cardContent
        )}
    </div>
  );
}
