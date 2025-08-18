
"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { CalendarIcon, Plus, Trash, Edit, Wand2, X, FilePenLine, Share2, Loader2, ListX } from "lucide-react";
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
  DialogClose,
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
import { Badge } from "./ui/badge";
import { DeleteGoalAlert } from "./delete-goal-alert";
import { useAuth } from "@/context/AuthContext";
import { addGoalTemplate } from "@/lib/goals-service";

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
  onGoalDelete: (goalId: string) => void;
  trigger: React.ReactNode;
}

export function EditGoalDialog({ goal, onGoalUpdate, onGoalDelete, trigger }: EditGoalDialogProps) {
  const [open, setOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [subGoals, setSubGoals] = useState<Goal[]>(goal.subGoals || []);
  const { toast } = useToast();
  const { user } = useAuth();


  useEffect(() => {
    if (open) {
      // Reset form and subgoals when dialog is opened or goal changes
      form.reset({
        title: goal.title,
        description: goal.description || "",
        project: goal.project,
        status: goal.status,
        priority: goal.priority,
        dueDate: goal.dueDate,
      });
      setSubGoals(goal.subGoals || []);
    } else {
        // Reset editing state when dialog closes
        setIsEditing(false);
    }
  }, [goal, open]);

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
    setIsEditing(false); // Switch back to view mode after saving
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
        project: form.getValues('project'), // Use current project from form
        status: 'todo',
        priority: form.getValues('priority'), // Use current priority from form
        dueDate: form.getValues('dueDate') // Use current due date from form
      }));

    setSubGoals(prev => [...prev, ...newGoals]);
  }
  
  const handleAddManualSubGoal = () => {
    const newSubGoal: Goal = {
        id: crypto.randomUUID(),
        title: "New sub-goal",
        description: "",
        project: form.getValues('project'),
        status: 'todo',
        priority: form.getValues('priority'),
        dueDate: form.getValues('dueDate')
    };
    setSubGoals(prev => [...prev, newSubGoal]);
  };

  const handleSubGoalUpdate = (updatedSubGoal: Goal) => {
    setSubGoals(prev => prev.map(sg => sg.id === updatedSubGoal.id ? updatedSubGoal : sg));
  }

  const handleSubGoalDelete = (id: string) => {
    setSubGoals(prev => prev.filter(sg => sg.id !== id));
  }
  
  const handleCancel = () => {
    // Reset form to original goal state
    form.reset({
      title: goal.title,
      description: goal.description || "",
      project: goal.project,
      status: goal.status,
      priority: goal.priority,
      dueDate: goal.dueDate,
    });
    setSubGoals(goal.subGoals || []);
    setIsEditing(false);
  }

  const handleDeleteGoal = () => {
    onGoalDelete(goal.id);
    setOpen(false);
    toast({
        title: "Goal Deleted",
        description: `The goal "${goal.title}" has been deleted.`,
    });
  }

  const handleShare = async () => {
    if (!user) {
        toast({ variant: "destructive", title: "Not authenticated." });
        return;
    }
    setIsSharing(true);
    try {
        await addGoalTemplate({
            title: goal.title,
            description: goal.description,
            project: goal.project,
            subGoals: subGoals.map(sg => ({ 
                title: sg.title,
                description: sg.description || "",
                // This is a placeholder, as the sub-goal doesn't have estimatedTime
                estimatedTime: "not set" 
            })),
            authorId: user.uid,
            authorName: user.displayName || user.email || "Anonymous",
            likes: 0,
        });
        toast({
            title: "Goal Shared!",
            description: "Your goal is now available in the public library.",
        });
        setOpen(false);
    } catch (e) {
        console.error(e);
        toast({
            variant: "destructive",
            title: "Sharing Failed",
            description: "Could not share the goal. Please try again.",
        });
    } finally {
        setIsSharing(false);
    }
  };


  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild onClick={(e) => { e.stopPropagation(); setOpen(true); }}>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-3xl" onPointerDownOutside={(e) => {if (e.target instanceof HTMLElement && e.target.closest('[data-radix-popper-content-wrapper]')) { e.preventDefault(); }}}>
        <DialogHeader>
          <DialogTitle className="font-headline flex items-center gap-2">
            {isEditing ? <FilePenLine /> : <span className="text-sm"><Badge variant="secondary">{goal.project}</Badge></span>}
            {isEditing ? 'Edit Goal' : goal.title}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? 'Manage all aspects of your goal and its sub-goals.' : (goal.description || "No description provided.")}
          </DialogDescription>
        </DialogHeader>

        {isEditing ? (
            // EDIT MODE
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
                    <BreakDownGoalDialog goal={form.getValues() as Goal} onSubGoalsAdd={handleSubGoalAdd}>
                        <Button type="button" variant="outline" size="sm">
                            <Wand2 className="mr-2 h-4 w-4" />
                            Add with AI
                        </Button>
                    </BreakDownGoalDialog>
                </div>

                <ScrollArea className="h-[500px] border rounded-md p-2">
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
                 <div className="flex gap-2">
                    <Button type="button" variant="secondary" className="w-full" onClick={handleAddManualSubGoal}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Sub-goal Manually
                    </Button>
                    {subGoals.length > 0 && (
                        <Button type="button" variant="outline" onClick={() => setSubGoals([])}>
                             <ListX className="mr-2 h-4 w-4" />
                             Clear list
                        </Button>
                    )}
                </div>
                </div>
                
                <DialogFooter className="col-span-1 md:col-span-2">
                    <Button type="button" variant="ghost" onClick={handleCancel}>Cancel</Button>
                    <Button type="submit">Save Changes</Button>
                </DialogFooter>
            </form>
            </Form>
        ) : (
            // VIEW MODE
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-4">
                {/* Left Column: Details */}
                <div className="space-y-4">
                    <div className="space-y-1">
                        <h4 className="text-sm font-medium text-muted-foreground">Status</h4>
                        <p className="text-base">{goal.status}</p>
                    </div>
                    <div className="space-y-1">
                        <h4 className="text-sm font-medium text-muted-foreground">Priority</h4>
                        <p className="text-base">{goal.priority}</p>
                    </div>
                    {goal.dueDate && (
                        <div className="space-y-1">
                            <h4 className="text-sm font-medium text-muted-foreground">Due Date</h4>
                            <p className="text-base">{format(goal.dueDate, "PPP")}</p>
                        </div>
                    )}
                </div>
                {/* Right Column: Sub-goals */}
                <div className="space-y-4">
                     <h4 className="text-sm font-medium text-muted-foreground">Sub-goals</h4>
                     <ScrollArea className="h-[500px] border rounded-md p-2">
                        {subGoals.length > 0 ? (
                            <div className="space-y-2">
                                {subGoals.map(sg => (
                                    <Card key={sg.id}>
                                        <CardContent className="p-3">
                                            <p className="font-semibold text-sm">{sg.title}</p>
                                            {sg.description && <p className="text-sm text-muted-foreground">{sg.description}</p>}
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center text-sm text-muted-foreground py-12">
                                No sub-goals for this goal.
                            </div>
                        )}
                    </ScrollArea>
                </div>
                <DialogFooter className="col-span-1 md:col-span-2">
                    <div className="flex justify-between w-full">
                         <div className="flex gap-2">
                            <DeleteGoalAlert onConfirm={handleDeleteGoal}>
                                <Button variant="destructive">
                                    <Trash className="mr-2 h-4 w-4" />
                                    Delete
                                </Button>
                            </DeleteGoalAlert>
                             <Button variant="outline" onClick={handleShare} disabled={isSharing}>
                                {isSharing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Share2 className="mr-2 h-4 w-4" />}
                                Share
                            </Button>
                        </div>
                        <Button onClick={() => setIsEditing(true)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Goal
                        </Button>
                    </div>
                </DialogFooter>
            </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
