

"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { CalendarIcon, Flag, Plus, Trash2, Wand2, Clock } from "lucide-react";
import { format } from "date-fns";

import type { Task, TaskPriority } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Separator } from "./ui/separator";
import { Checkbox } from "./ui/checkbox";
import { ScrollArea } from "./ui/scroll-area";
import { BreakDownTaskDialog, type SubTask as GeneratedSubTask } from "./break-down-task-dialog";
import { Label } from "./ui/label";
import { useAuth } from "@/context/AuthContext";
import { useTaskStore } from "@/hooks/use-task-store";
import { getSubTasks, deleteTask } from "@/lib/goals-service";

const priorityMap: Record<TaskPriority, { label: string; color: string; icon: React.ReactNode }> = {
    p1: { label: "Priority 1", color: "text-red-500", icon: <Flag className="h-4 w-4" /> },
    p2: { label: "Priority 2", color: "text-orange-500", icon: <Flag className="h-4 w-4" /> },
    p3: { label: "Priority 3", color: "text-blue-500", icon: <Flag className="h-4 w-4" /> },
    p4: { label: "Priority 4", color: "text-muted-foreground", icon: <Flag className="h-4 w-4" /> },
};

const taskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  priority: z.custom<TaskPriority>(),
  dueDate: z.date().optional(),
  time: z.string().optional(),
  duration: z.coerce.number().min(0).optional(),
});

type TaskFormValues = z.infer<typeof taskSchema>;

interface TaskDialogProps {
  task?: Task;
  onSave: (data: Omit<Task, 'id' | 'createdAt' | 'updatedAt'> | Task) => void;
  onDelete?: (taskId: string) => void;
  children: React.ReactNode;
}

export function TaskDialog({ task, onSave, onDelete, children }: TaskDialogProps) {
  const [open, setOpen] = useState(false);
  const [subTasks, setSubTasks] = useState<Task[]>([]);
  const isEditMode = !!task;
  const { appUser } = useAuth();
  const { addTask, updateTask: updateTaskInStore } = useTaskStore();

  const fetchSubTasks = async () => {
    if (task?.id) {
        const fetchedSubTasks = await getSubTasks(task.id);
        setSubTasks(fetchedSubTasks);
    }
  }

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
  });
  
  useEffect(() => {
    if (task?.id) {
        fetchSubTasks();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task?.id])

  useEffect(() => {
    if (open) {
      form.reset({
        title: task?.title ?? "",
        description: task?.description ?? "",
        priority: task?.priority as TaskPriority ?? "p4",
        dueDate: task?.dueDate ? new Date(task.dueDate) : undefined,
        time: task?.time || "",
        duration: task?.duration || 60,
      });
      if (task?.id) {
        fetchSubTasks();
      } else {
        setSubTasks([]);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task, open, form]);
  
  const watchedTitle = form.watch("title");
  const watchedDescription = form.watch("description");

  const onSubmit = (data: TaskFormValues) => {
      const taskData = {
          ...data,
          isCompleted: task?.isCompleted || false,
      };

      if (isEditMode && task) {
          onSave({ ...task, ...taskData });
      } else if(appUser) {
          onSave({ ...taskData, userId: appUser.id });
      }
      handleOpenChange(false);
  };
  
  const handleOpenChange = (isOpen: boolean) => {
      setOpen(isOpen);
      if (!isOpen) {
          form.reset();
          setSubTasks([]);
      }
  }

  const handleSubTaskAdd = (newSubTasks: GeneratedSubTask[]) => {
    if (!appUser || !task) return;
    const tasksToAdd = newSubTasks.map(st => ({
        userId: appUser.id,
        parentId: task.id,
        title: st.title,
        description: st.description,
        isCompleted: false,
        priority: 'p4' as TaskPriority
    }));
    tasksToAdd.forEach(t => addTask(t).then(() => fetchSubTasks()));
  };
  
  const handleToggleSubTask = (subTask: Task) => {
    if(!appUser) return;
    updateTaskInStore({ ...subTask, isCompleted: !subTask.isCompleted }).then(() => fetchSubTasks());
  };
  
  const handleDeleteSubTask = (subTaskId: string) => {
     if(!appUser) return;
     deleteTask(subTaskId).then(() => fetchSubTasks());
  };


  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild onClick={(e) => { e.stopPropagation(); e.preventDefault(); setOpen(true); }}>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-lg" onPointerDownOutside={(e) => {if (e.target instanceof HTMLElement && e.target.closest('[data-radix-popper-content-wrapper]')) { e.preventDefault(); }}}>
        <DialogHeader>
          <DialogTitle className="font-headline">{isEditMode ? "Edit Task" : "Add a new Task"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input placeholder="e.g. Schedule a doctor appointment" {...field} className="text-lg font-semibold border-none px-2 focus-visible:ring-1"/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea placeholder="Description..." {...field} className="border-none px-2 focus-visible:ring-1" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <div className="grid grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="dueDate"
                    render={({ field }) => (
                        <FormItem>
                        <Popover>
                            <PopoverTrigger asChild>
                            <FormControl>
                                <Button
                                variant={"outline"}
                                className={cn(
                                    "w-full pl-3 text-left font-normal justify-start",
                                    !field.value && "text-muted-foreground"
                                )}
                                >
                                <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                                {field.value ? (
                                    format(field.value, "PPP")
                                ) : (
                                    <span>Due date</span>
                                )}
                                </Button>
                            </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                initialFocus
                            />
                            </PopoverContent>
                        </Popover>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                        <FormItem>
                            <Select onValueChange={field.onChange as any} defaultValue={field.value}>
                                <FormControl>
                                <Button asChild variant="outline" className="w-full justify-start">
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select priority" />
                                    </SelectTrigger>
                                </Button>
                                </FormControl>
                                <SelectContent>
                                    {Object.entries(priorityMap).map(([key, value]) => (
                                        <SelectItem key={key} value={key}>
                                            <div className={cn("flex items-center gap-2", value.color)}>
                                                {React.cloneElement(value.icon as React.ReactElement)}
                                                <span>{value.label}</span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </FormItem>
                    )}
                />
             </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <FormField
                      control={form.control}
                      name="time"
                      render={({ field }) => (
                        <FormItem className="flex-grow">
                           <Label htmlFor="time" className="sr-only">Time</Label>
                          <FormControl>
                            <Input id="time" type="time" {...field} value={field.value || ""} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                </div>
                 <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <FormField
                      control={form.control}
                      name="duration"
                      render={({ field }) => (
                        <FormItem className="flex-grow">
                           <Label htmlFor="duration" className="sr-only">Duration (minutes)</Label>
                          <FormControl>
                            <Input id="duration" type="number" placeholder="Duration (min)" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                </div>
            </div>
             
            {isEditMode && (
                <>
                <Separator />
                <div>
                    <div className="flex justify-between items-center mb-2">
                        <h4 className="text-sm font-medium text-muted-foreground">Sub-tasks</h4>
                        <BreakDownTaskDialog 
                            task={{title: watchedTitle, description: watchedDescription}} 
                            onSubTasksAdd={handleSubTaskAdd}
                        >
                            <Button type="button" variant="outline" size="sm">
                                <Wand2 className="mr-2 h-4 w-4"/> AI Breakdown
                            </Button>
                        </BreakDownTaskDialog>
                    </div>
                    <ScrollArea className="h-48 border rounded-md p-2">
                        {subTasks.length > 0 ? (
                            <div className="space-y-1">
                                {subTasks.map(st => (
                                    <div key={st.id} className="flex items-center gap-2 group p-1 rounded-md hover:bg-muted/50">
                                        <Checkbox
                                            id={`subtask-${st.id}`}
                                            checked={st.isCompleted}
                                            onCheckedChange={() => handleToggleSubTask(st)}
                                        />
                                        <Label htmlFor={`subtask-${st.id}`} className={cn("text-sm flex-grow cursor-pointer", st.isCompleted && "line-through text-muted-foreground")}>
                                            {st.title}
                                        </Label>
                                        <Button 
                                            type="button" 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-6 w-6 opacity-0 group-hover:opacity-100"
                                            onClick={() => handleDeleteSubTask(st.id)}
                                        >
                                            <Trash2 className="h-4 w-4"/>
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center text-xs text-muted-foreground py-16">
                                No sub-tasks yet.
                            </div>
                        )}
                    </ScrollArea>
                </div>
                </>
            )}

            <div className={cn("flex", isEditMode ? "justify-between" : "justify-end")}>
                {isEditMode && onDelete && task.id && (
                    <Button type="button" variant="destructive" onClick={() => {onDelete(task.id); setOpen(false);}}>
                        <Trash2 className="h-4 w-4" />
                    </Button>
                )}
                <div className="flex gap-2">
                    <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button type="submit">{isEditMode ? "Save Changes" : "Add Task"}</Button>
                </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
