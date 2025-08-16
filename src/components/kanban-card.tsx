"use client"

import { ArrowDown, ArrowRight, ArrowUp, Calendar as CalendarIcon, MoreHorizontal, Trash, Edit } from "lucide-react";
import { format } from "date-fns";

import type { Task, TaskPriority } from "@/types";
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
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { TaskDialog } from "@/components/task-dialog";

interface KanbanCardProps {
  task: Task;
  onTaskUpdate: (task: Task) => void;
  onTaskDelete: (taskId: string) => void;
}

const priorityIcons: Record<TaskPriority, React.ReactNode> = {
  high: <ArrowUp className="h-4 w-4 text-destructive" />,
  medium: <ArrowRight className="h-4 w-4 text-yellow-500" />,
  low: <ArrowDown className="h-4 w-4 text-green-500" />,
};

const priorityTooltips: Record<TaskPriority, string> = {
  high: 'High Priority',
  medium: 'Medium Priority',
  low: 'Low Priority'
}

export function KanbanCard({ task, onTaskUpdate, onTaskDelete }: KanbanCardProps) {
  return (
    <Card className="hover:shadow-lg transition-shadow duration-200">
      <CardHeader className="p-4 pb-2">
        <div className="flex items-start justify-between">
          <Badge variant="secondary">{task.project}</Badge>
          <TaskDialog 
            task={task} 
            onSave={(updatedTask) => onTaskUpdate({ ...updatedTask, id: task.id })}
            triggerButton={
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                     <div className="w-full">
                        <TaskDialog 
                          task={task} 
                          onSave={(updatedTask) => onTaskUpdate({ ...updatedTask, id: task.id })}
                          triggerButton={
                            <button className="w-full text-left flex items-center">
                              <Edit className="mr-2 h-4 w-4" />
                              <span>Edit</span>
                            </button>
                          } 
                        />
                      </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onTaskDelete(task.id)} className="text-destructive">
                    <Trash className="mr-2 h-4 w-4" />
                    <span>Delete</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            }
          />
        </div>
        <CardTitle className="text-base font-medium pt-2">{task.title}</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          {task.dueDate && (
            <div className="flex items-center gap-1">
              <CalendarIcon className="h-4 w-4" />
              <span>{format(task.dueDate, "MMM d")}</span>
            </div>
          )}
          <div className="flex items-center" title={priorityTooltips[task.priority]}>
            {priorityIcons[task.priority]}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
