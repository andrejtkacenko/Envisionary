

"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { CalendarIcon, Plus, Trash, Edit, Wand2, X, FilePenLine, Share2, Loader2, ListX, Clock, Repeat } from "lucide-react";
import { format } from "date-fns";
import isEqual from 'lodash.isequal';


import type { Goal, GoalStatus, GoalTemplateSubGoal } from "@/types";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
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
import { BreakDownGoalDialog } from "./break-down-goal-dialog";
import { Badge } from "./ui/badge";
import { DeleteGoalAlert } from "./delete-goal-alert";
import { useAuth } from "@/context/AuthContext";
import { addGoalTemplate, addGoal, updateGoal, deleteGoal as deleteSubGoal } from "@/lib/goals-service";

const goalSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  category: z.string().optional(),
  status: z.custom<GoalStatus>(),
  priority: z.enum(["low", "medium", "high"]),
  dueDate: z.date().optional(),
  estimatedTime: z.string().optional(),
});

type GoalFormValues = z.infer<typeof goalSchema>;

interface EditGoalDialogProps {
  goal: Goal;
  subGoals: Goal[];
  onGoalUpdate: (goal: Goal) => void;
  onGoalDelete: (goalId: string) => void;
  trigger: React.ReactNode;
  onOpenChange?: (open: boolean) => void;
  onSubGoalsChange: () => void;
}

export function EditGoalDialog({ goal, subGoals: initialSubGoals, onGoalUpdate, onGoalDelete, trigger, onOpenChange, onSubGoalsChange }: EditGoalDialogProps) {
  const [open, setOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [localSubGoals, setLocalSubGoals] = useState<Goal[]>([]);
  const [showUnsavedChangesAlert, setShowUnsavedChangesAlert] = useState(false);
  const { toast } = useToast();
  const { appUser } = useAuth();
  
  const form = useForm<GoalFormValues>({
    resolver: zodResolver(goalSchema),
  });

  const { formState: { isDirty } } = form;
  const subGoalsAreDirty = !isEqual(localSubGoals, initialSubGoals);
  const isFormDirty = isDirty || subGoalsAreDirty;


  useEffect(() => {
    if (open) {
      form.reset({
        title: goal.title,
        description: goal.description || "",
        category: goal.category,
        status: goal.status as GoalStatus,
        priority: goal.priority as "low" | "medium" | "high",
        dueDate: goal.dueDate ? new Date(goal.dueDate) : undefined,
        estimatedTime: goal.estimatedTime || "",
      });
      setLocalSubGoals(initialSubGoals);
    } else {
        setIsEditing(false);
    }
  }, [goal, initialSubGoals, open, form]);

  const handleSaveChanges = async () => {
    const isValid = await form.trigger();
    if (isValid) {
      await onSubmit(form.getValues());
      setOpen(false);
    } else {
        toast({
            variant: "destructive",
            title: "Validation Error",
            description: "Please fix the errors before saving.",
        });
    }
  };

  const onSubmit = async (data: GoalFormValues) => {
    const updatedData = {
      ...goal,
      ...data,
      category: data.category || 'General',
    };
    onGoalUpdate(updatedData);
    setIsEditing(false);
    form.reset(data);
    toast({
      title: "Goal Updated",
      description: `The goal "${data.title}" has been successfully updated.`,
    });
  };
  
  const handleDialogStateChange = (isOpen: boolean) => {
    if (!isOpen && isFormDirty && isEditing) {
      setShowUnsavedChangesAlert(true);
    } else {
      setOpen(isOpen);
      if (onOpenChange) {
        onOpenChange(isOpen);
      }
    }
  };

  const handleSubGoalAdd = (newSubGoals: GoalTemplateSubGoal[]) => {
      if (!appUser) return;
      const goalsToAdd = newSubGoals.map(sg => ({
        userId: appUser.id,
        parentId: goal.id,
        title: sg.title,
        description: sg.description,
        category: form.getValues('category') || 'General',
        status: 'todo' as GoalStatus,
        priority: form.getValues('priority'),
        dueDate: form.getValues('dueDate'),
        estimatedTime: sg.estimatedTime,
      }));
      goalsToAdd.forEach(g => addGoal(g).then(() => onSubGoalsChange()));
  }
  
  const handleAddManualSubGoal = () => {
    if (!appUser) return;
    const newSubGoal: Omit<Goal, 'id'|'createdAt'|'updatedAt'> = {
        userId: appUser.id,
        parentId: goal.id,
        title: "New sub-goal",
        description: "",
        category: form.getValues('category') || 'General',
        status: 'todo',
        priority: form.getValues('priority'),
        dueDate: form.getValues('dueDate'),
    };
    addGoal(newSubGoal).then(() => onSubGoalsChange());
  };

  const handleSubGoalUpdate = (updatedSubGoal: Goal) => {
    updateGoal(updatedSubGoal).then(() => onSubGoalsChange());
  }

  const handleSubGoalDelete = (id: string) => {
    deleteSubGoal(id).then(() => onSubGoalsChange());
  }
  
  const handleCancel = () => {
    // Reset form to original goal state
    form.reset({
      title: goal.title,
      description: goal.description || "",
      category: goal.category,
      status: goal.status as GoalStatus,
      priority: goal.priority as any,
      dueDate: goal.dueDate ? new Date(goal.dueDate) : undefined,
      estimatedTime: goal.estimatedTime || ""
    });
    setLocalSubGoals(initialSubGoals);
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
    if (!appUser) {
        toast({ variant: "destructive", title: "Not authenticated." });
        return;
    }
    setIsSharing(true);
    try {
        await addGoalTemplate({
            title: goal.title,
            description: goal.description || undefined,
            category: goal.category || 'General',
            subGoals: localSubGoals.map(sg => ({ 
                title: sg.title,
                description: sg.description || "",
                estimatedTime: sg.estimatedTime || "not set" 
            })),
            authorId: appUser.id,
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
    <>
    <Dialog open={open} onOpenChange={handleDialogStateChange}>
      <DialogTrigger asChild onClick={(e) => { e.stopPropagation(); handleDialogStateChange(true); }}>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-3xl" onPointerDownOutside={(e) => {if (e.target instanceof HTMLElement && e.target.closest('[data-radix-popper-content-wrapper]')) { e.preventDefault(); }}}>
        <DialogHeader>
          <DialogTitle className="font-headline flex items-center gap-2">
            {isEditing ? <FilePenLine /> : <span className="text-sm"><Badge variant="secondary">{goal.category || 'Uncategorized'}</Badge></span>}
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
                    name="category"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Category (optional)</FormLabel>
                        <FormControl>
                        <Input placeholder="e.g. Work, Health, Learning" {...field} />
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
                            <SelectItem value="ongoing">Ongoing</SelectItem>
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
                 <div className="grid grid-cols-2 gap-4">
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
                    <FormField
                      control={form.control}
                      name="estimatedTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Estimated Time</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. 2 hours" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                </div>
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

                <ScrollArea className="h-[430px] border rounded-md p-2">
                    {localSubGoals.length > 0 ? (
                        <div className="space-y-2">
                            {localSubGoals.map(sg => (
                                <Card key={sg.id} className="group">
                                    <CardContent className="p-3 flex items-center justify-between">
                                        <div>
                                            <p className="font-semibold text-sm">{sg.title}</p>
                                            {sg.description && <p className="text-sm text-muted-foreground">{sg.description}</p>}
                                        </div>
                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
                                            {/* Edit for sub-goal would be complex, omitting for now */}
                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive/70 hover:text-destructive" onClick={() => handleSubGoalDelete(sg.id)}>
                                                <Trash className="h-4 w-4" />
                                            </Button>
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
                        Add Sub-goal
                    </Button>
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
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <h4 className="text-sm font-medium text-muted-foreground">Status</h4>
                            <p className="text-base capitalize flex items-center gap-1">
                                {goal.status === 'ongoing' && <Repeat className="h-4 w-4" />}
                                {goal.status}
                            </p>
                        </div>
                        <div className="space-y-1">
                            <h4 className="text-sm font-medium text-muted-foreground">Priority</h4>
                            <p className="text-base capitalize">{goal.priority}</p>
                        </div>
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                        {goal.dueDate && (
                            <div className="space-y-1">
                                <h4 className="text-sm font-medium text-muted-foreground">Due Date</h4>
                                <p className="text-base">{format(new Date(goal.dueDate), "PPP")}</p>
                            </div>
                        )}
                        {goal.estimatedTime && (
                            <div className="space-y-1">
                                <h4 className="text-sm font-medium text-muted-foreground">Estimated Time</h4>
                                <p className="text-base">{goal.estimatedTime}</p>
                            </div>
                        )}
                     </div>
                </div>
                {/* Right Column: Sub-goals */}
                <div className="space-y-4">
                     <h4 className="text-sm font-medium text-muted-foreground">Sub-goals / Plan</h4>
                     <ScrollArea className="h-[430px] border rounded-md p-2">
                        {initialSubGoals.length > 0 ? (
                            <div className="space-y-2">
                                {initialSubGoals.map(sg => (
                                    <Card key={sg.id}>
                                        <CardContent className="p-3">
                                            <p className="font-semibold text-sm">{sg.title}</p>
                                            {sg.description && <p className="text-sm text-muted-foreground mb-2">{sg.description}</p>}
                                            {sg.estimatedTime && (
                                                 <Badge variant="outline" className="flex-shrink-0 w-fit">
                                                    <Clock className="mr-1.5 h-3 w-3"/>
                                                    {sg.estimatedTime}
                                                </Badge>
                                            )}
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
                                {isSharing ? 'Sharing...' : 'Share'}
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
    <AlertDialog open={showUnsavedChangesAlert} onOpenChange={setShowUnsavedChangesAlert}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
                You have unsaved changes. Do you want to save them before closing?
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => {
                    handleDialogStateChange(false);
                    setShowUnsavedChangesAlert(false);
                }}>
                    Cancel
                </AlertDialogCancel>
                <Button variant="outline" onClick={() => {
                    handleDialogStateChange(false)
                    setShowUnsavedChangesAlert(false)
                }}>
                    Discard Changes
                </Button>
                <AlertDialogAction onClick={handleSaveChanges}>
                    Save and Close
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
