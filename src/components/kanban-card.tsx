

"use client"

import { useState, useEffect } from "react";
import { ArrowRight, Calendar as CalendarIcon, Clock, CheckCircle, Loader, Repeat } from "lucide-react";
import { format } from "date-fns";

import type { Goal, GoalStatus } from "@/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { EditGoalDialog } from "./edit-goal-dialog";
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { getSubGoals } from "@/lib/goals-service";


interface KanbanCardProps {
  goal: Goal;
  isOverlay?: boolean;
  onGoalUpdate?: (goal: Goal) => void;
  onGoalDelete?: (goalId: string) => void;
}

const statusIcons: Record<GoalStatus, React.ReactNode> = {
    todo: <ArrowRight className="h-4 w-4 text-muted-foreground" />,
    inprogress: <Loader className="h-4 w-4 text-blue-500 animate-spin" />,
    done: <CheckCircle className="h-4 w-4 text-green-500" />,
    ongoing: <Repeat className="h-4 w-4 text-purple-500" />,
};


export function KanbanCard({ goal, isOverlay, onGoalUpdate, onGoalDelete }: KanbanCardProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [subGoals, setSubGoals] = useState<Goal[]>([]);
  
  useEffect(() => {
    if (goal.id) {
        getSubGoals(goal.id).then(setSubGoals);
    }
  }, [goal.id]);

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
    disabled: isDialogOpen,
  });

  const style = {
    transition,
    transform: CSS.Transform.toString(transform),
  };

  const completedSubGoals = subGoals.filter(sg => sg.status === 'done').length;
  const totalSubGoals = subGoals.length;
  const progress = totalSubGoals > 0 ? (completedSubGoals / totalSubGoals) * 100 : 0;
  
  const cardContent = (
    <Card 
        className={cn(
            "hover:shadow-md transition-shadow duration-200 flex flex-col bg-card/50 backdrop-blur-sm w-full",
            isDragging && "opacity-30",
            isOverlay && "shadow-lg scale-105"
        )}
    >
        <CardHeader className="p-2 md:p-4 pb-2">
            <div className="flex items-start justify-between">
                <Badge variant="secondary" className="text-xs">{goal.category || 'Uncategorized'}</Badge>
                <div className="flex items-center gap-2">
                     <span title={`Status: ${goal.status}`}>
                        {statusIcons[goal.status]}
                    </span>
                </div>
            </div>
            <CardTitle className="text-sm md:text-base font-medium pt-2">{goal.title}</CardTitle>
        </CardHeader>
        <CardContent className="p-2 md:p-4 pt-0 flex-grow space-y-3">
            <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground">
                {goal.dueDate && (
                    <div className="flex items-center gap-1">
                    <CalendarIcon className="h-4 w-4" />
                    <span>{format(new Date(goal.dueDate), "MMM d")}</span>
                    </div>
                )}
                {goal.estimatedTime && (
                    <Badge variant="outline" className="flex items-center gap-1 text-xs">
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
                subGoals={subGoals}
                onGoalUpdate={onGoalUpdate}
                onGoalDelete={onGoalDelete}
                onOpenChange={setIsDialogOpen}
                trigger={cardContent}
            />
        ) : (
            cardContent
        )}
    </div>
  );
}
