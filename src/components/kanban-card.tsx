
"use client"

import { useState } from "react";
import { ArrowDown, ArrowRight, ArrowUp, Calendar as CalendarIcon, MoreHorizontal, Trash, Edit, ChevronDown } from "lucide-react";
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
  const [isSubtasksOpen, setIsSubtasksOpen] = useState(false);

  const handleSubGoalChange = (subGoalId: string, checked: boolean) => {
      const updatedSubGoals = goal.subGoals?.map(sg => 
          sg.id === subGoalId ? { ...sg, status: checked ? 'done' : 'todo' } : sg
      );
      const updatedParentGoal = { ...goal, subGoals: updatedSubGoals };
      
      onGoalUpdate(updatedParentGoal);
  };

  const completedSubGoals = goal.subGoals?.filter(sg => sg.status === 'done').length || 0;
  const totalSubGoals = goal.subGoals?.length || 0;
  const progress = totalSubGoals > 0 ? (completedSubGoals / totalSubGoals) * 100 : 0;

  return (
    <Card className="hover:shadow-lg transition-shadow duration-200 flex flex-col">
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
                       <EditGoalDialog
                         goal={goal}
                         onGoalUpdate={onGoalUpdate}
                         trigger={
                           <button className="w-full text-left flex items-center">
                             <Edit className="mr-2 h-4 w-4" />
                             <span>Edit Goal</span>
                           </button>
                         }
                       />
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
        <CardContent className="p-4 pt-0 flex-grow">
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
            {totalSubGoals > 0 && (
                <div className="mt-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                        <span>Sub-Goals</span>
                        <span>{completedSubGoals}/{totalSubGoals}</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                </div>
            )}
        </CardContent>
      {goal.subGoals && goal.subGoals.length > 0 && (
        <Collapsible open={isSubtasksOpen} onOpenChange={setIsSubtasksOpen} className="border-t mt-auto">
            <CollapsibleTrigger asChild>
                <button className="flex justify-between items-center w-full p-3 text-sm font-medium text-muted-foreground hover:bg-muted/50">
                    <span>{isSubtasksOpen ? "Hide Sub-goals" : `Show ${totalSubGoals} Sub-goals`}</span>
                    <ChevronDown className={cn("h-4 w-4 transition-transform", isSubtasksOpen && "rotate-180")} />
                </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="px-4 pb-4 space-y-2">
                {goal.subGoals.map(sg => (
                    <div key={sg.id} className="flex items-center gap-2 group">
                        <Checkbox 
                            id={`card-${sg.id}`}
                            checked={sg.status === 'done'}
                            onCheckedChange={(checked) => handleSubGoalChange(sg.id, !!checked)}
                        />
                        <label htmlFor={`card-${sg.id}`} className={cn("text-sm flex-grow", sg.status === 'done' && 'line-through text-muted-foreground')}>{sg.title}</label>
                    </div>
                ))}
            </CollapsibleContent>
        </Collapsible>
      )}
    </Card>
  );
}
