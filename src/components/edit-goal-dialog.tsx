
"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { CalendarIcon, Plus, Trash, Edit, Wand2, X } from "lucide-react";
import { format } from "date-fns";

import type { Goal } from "@/types";
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
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "./ui/scroll-area";
import { Card, CardContent } from "./ui/card";
import { DeleteSubGoalAlert } from "./delete-subgoal-alert";
import { GoalDialog } from "./goal-dialog";
import { BreakDownGoalDialog, SubGoal } from "./break-down-goal-dialog";

const goalSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  project: z.string().min(1, "Project is required"),
  status: z.enum(["todo", "inprogress", "done"]),
  priority: z.enum(["low", "medium", "high"]),
  dueDate: z.date().optional(),
});

type GoalFormValues = z.infer<typeof goalSchema>;

interface EditGoalDialogProps {
  goal: Goal;
  onGoalUpdate: (goal: Goal) => void;
  trigger: React.ReactNode;
}

export function EditGoalDialog({ goal, onGoalUpdate, trigger }: EditGoalDialogProps) {
  const [open, setOpen] = useState(false);
  const [subGoals, setSubGoals] = useState<Goal[]>(goal.subGoals || []);
  const { toast } = useToast();

  useEffect(() => {
    setSubGoals(goal.subGoals || []);
  }, [goal.subGoals]);

  const form = useForm<GoalFormValues>({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      title: goal.title,
      description: goal.description || "",
      project: goal.project,
      status: goal.status,
      priority: goal.priority,
      dueDate: goal.dueDate,
    },
  });

  const onSubmit = (data: GoalFormValues) => {
    const updatedGoal = {
      ...goal,
      ...data,
      subGoals: subGoals,
    };
    onGoalUpdate(updatedGoal);
    setOpen(false);
    toast({
      title: "Goal Updated",
      description: `The goal "${data.title}" has been successfully updated.`,
    });
  };

  const handleSubGoalAdd = (newSubGoals: SubGoal[]) => {
    const newGoals: Goal[] = newSubGoals.map(sg => ({
        id: crypto.randomUUID(),
        title: sg.title,
        description: sg.description,
        project: goal.project,
        status: 'todo',
        priority: goal.priority,
        dueDate: goal.dueDate
      }));

    setSubGoals(prev => [...prev, ...newGoals]);
  }

  const handleSubGoalUpdate = (updatedSubGoal: Goal) => {
    setSubGoals(prev => prev.map(sg => sg.id === updatedSubGoal.id ? updatedSubGoal : sg));
  }

  const handleSubGoalDelete = (id: string) => {
    setSubGoals(prev => prev.filter(sg => sg.id !== id));
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild onClick={(e) => { e.stopPropagation(); setOpen(true); }}>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-3xl" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="font-headline">Edit Goal</DialogTitle>
          <DialogDescription>
            Manage all aspects of your goal and its sub-goals in one place.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left Column: Main Goal Form */}
            <div className="space-y-4 py-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Design landing page" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="project"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Website Redesign" {...field} />
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
                    <FormLabel>Description (Notes)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Add any notes or details..." className="resize-none" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                 <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="todo">To Do</SelectItem>
                          <SelectItem value="inprogress">In Progress</SelectItem>
                          <SelectItem value="done">Done</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select priority" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
               <FormField
                  control={form.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Due Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date(new Date().setDate(new Date().getDate() -1))}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </div>
            
            {/* Right Column: Sub-goals */}
            <div className="space-y-4 py-4">
              <div className="flex justify-between items-center">
                <FormLabel>Sub-goals</FormLabel>
                <BreakDownGoalDialog goal={goal} onSubGoalsAdd={handleSubGoalAdd}>
                    <Button type="button" variant="outline" size="sm">
                        <Wand2 className="mr-2 h-4 w-4" />
                        Add with AI
                    </Button>
                </BreakDownGoalDialog>
              </div>

              <ScrollArea className="h-72 border rounded-md p-2">
                {subGoals.length > 0 ? (
                    <div className="space-y-2">
                        {subGoals.map(sg => (
                            <Card key={sg.id} className="group">
                                <CardContent className="p-3 flex items-center justify-between">
                                     <div>
                                        <p className="font-semibold text-sm">{sg.title}</p>
                                        {sg.description && <p className="text-sm text-muted-foreground">{sg.description}</p>}
                                    </div>
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
                                        <GoalDialog 
                                            goal={sg} 
                                            onSave={(updated) => handleSubGoalUpdate({ ...sg, ...updated })} 
                                            triggerButton={
                                                <Button variant="ghost" size="icon" className="h-7 w-7">
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                            }
                                        />
                                        <DeleteSubGoalAlert onConfirm={() => handleSubGoalDelete(sg.id)}>
                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive/70 hover:text-destructive">
                                                <Trash className="h-4 w-4" />
                                            </Button>
                                        </DeleteSubGoalAlert>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <div className="text-center text-sm text-muted-foreground py-12">
                        No sub-goals yet.
                    </div>
                )}
              </ScrollArea>
              <Button type="button" variant="secondary" className="w-full" onClick={() => handleSubGoalAdd([{title: "New sub-goal", description: ""}])}>
                <Plus className="mr-2 h-4 w-4" />
                Add Sub-goal Manually
              </Button>
            </div>
            
            <DialogFooter className="col-span-1 md:col-span-2">
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
