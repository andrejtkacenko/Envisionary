
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { CalendarIcon, Flag, Circle, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";

import type { Task, TaskPriority } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
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

const priorityMap: Record<TaskPriority, { label: string; color: string; icon: React.ReactNode }> = {
    p1: { label: "Priority 1", color: "text-red-500", icon: <Flag className="h-4 w-4 text-red-500" /> },
    p2: { label: "Priority 2", color: "text-orange-500", icon: <Flag className="h-4 w-4 text-orange-500" /> },
    p3: { label: "Priority 3", color: "text-blue-500", icon: <Flag className="h-4 w-4 text-blue-500" /> },
    p4: { label: "Priority 4", color: "text-muted-foreground", icon: <Flag className="h-4 w-4 text-muted-foreground" /> },
};

const taskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  project: z.string().optional(),
  priority: z.custom<TaskPriority>(),
  dueDate: z.date().optional(),
});

type TaskFormValues = z.infer<typeof taskSchema>;

interface TaskDialogProps {
  task?: Task;
  onSave: (data: Omit<Task, 'id' | 'createdAt'> | Task) => void;
  onDelete?: (taskId: string) => void;
  children: React.ReactNode;
}

export function TaskDialog({ task, onSave, onDelete, children }: TaskDialogProps) {
  const [open, setOpen] = useState(false);
  const isEditMode = !!task;

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: task?.title ?? "",
      description: task?.description ?? "",
      project: task?.project ?? "",
      priority: task?.priority ?? "p4",
      dueDate: task?.dueDate,
    },
  });

  const onSubmit = (data: TaskFormValues) => {
    if (isEditMode) {
      onSave({ ...task, ...data });
    } else {
      onSave({ ...data, isCompleted: false });
    }
    setOpen(false);
    form.reset();
  };
  
  const handleOpenChange = (isOpen: boolean) => {
      setOpen(isOpen);
      if (!isOpen) {
          form.reset({
              title: task?.title ?? "",
              description: task?.description ?? "",
              project: task?.project ?? "",
              priority: task?.priority ?? "p4",
              dueDate: task?.dueDate,
          })
      }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild onClick={(e) => e.stopPropagation()}>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-headline">{isEditMode ? "Edit Task" : "Add a new Task"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
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
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                                            <div className="flex items-center gap-2">
                                                {React.cloneElement(value.icon, { className: cn("h-4 w-4", value.color)})}
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
             <FormField
                control={form.control}
                name="project"
                render={({ field }) => (
                    <FormItem>
                    <FormControl>
                        <Input placeholder="Project or Category" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
            <DialogFooter>
                {isEditMode && onDelete && (
                    <Button type="button" variant="destructive" onClick={() => {onDelete(task.id); setOpen(false);}} className="mr-auto">
                        <Trash2 className="h-4 w-4" />
                    </Button>
                )}
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit">{isEditMode ? "Save Changes" : "Add Task"}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
