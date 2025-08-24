
"use client";

import { useState } from "react";
import { Loader2, Sparkles, Wand2, Plus, X, ListX } from "lucide-react";
import { breakDownTask } from "@/ai/flows/break-down-task";
import type { Task } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

interface BreakDownTaskDialogProps {
  task: Partial<Task>;
  children: React.ReactNode;
  onSubTasksAdd: (subTasks: SubTask[]) => void;
}

export type SubTask = {
  title: string;
  description: string;
};

export function BreakDownTaskDialog({ task, children, onSubTasksAdd }: BreakDownTaskDialogProps) {
  const [open, setOpen] = useState(false);
  const [subTasks, setSubTasks] = useState<SubTask[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [manualInput, setManualInput] = useState("");
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!task.title) {
        toast({
            variant: "destructive",
            title: "Task title is missing",
            description: "Please provide a title for the main task before using AI.",
        });
        return;
    }
    setIsLoading(true);
    try {
      const result = await breakDownTask({ 
        title: task.title, 
        description: task.description 
      });

      if (result.subTasks && result.subTasks.length > 0) {
        setSubTasks(prev => [...prev, ...result.subTasks]);
      } else {
        toast({
            variant: "default",
            title: "No sub-tasks generated",
            description: "Try again with a more detailed main task.",
        });
      }
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not break down the task. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleAddSubTasks = () => {
    onSubTasksAdd(subTasks);
    setOpen(false);
  }

  const handleManualAdd = () => {
    if (manualInput.trim() === "") return;
    setSubTasks(prev => [...prev, { title: manualInput.trim(), description: "Manually added sub-task." }]);
    setManualInput("");
  }

  const handleRemoveSubTask = (indexToRemove: number) => {
    setSubTasks(prev => prev.filter((_, index) => index !== indexToRemove));
  }
  
  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
        setSubTasks([]);
        setIsLoading(false);
        setManualInput("");
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild onClick={(e) => {e.preventDefault(); e.stopPropagation()}}>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-2xl" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="font-headline flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-primary" />
            Add Sub-tasks
          </DialogTitle>
          <DialogDescription>
            Use AI to break down your task &quot;{task.title || 'New Task'}&quot; or add sub-tasks manually.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-4">
            <div className="flex gap-2">
                <Input 
                    placeholder="Enter a new sub-task title"
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            handleManualAdd();
                        }
                    }}
                />
                <Button onClick={handleManualAdd} variant="outline">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Task
                </Button>
            </div>

            <div className="relative">
                <div aria-hidden="true" className="absolute inset-0 flex items-center">
                    <span className="w-full border-t"></span>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">Or</span>
                </div>
            </div>

            <Button onClick={handleGenerate} disabled={isLoading || !task.title} className="w-full">
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                Generate Plan with AI
            </Button>
            
            {isLoading && (
                <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground py-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <p>AI is building your plan...</p>
                </div>
            )}
            {subTasks.length > 0 && (
                 <ScrollArea className="h-60 mt-4">
                    <div className="space-y-2 pr-4">
                        <h4 className="text-sm font-medium text-muted-foreground">Execution Plan</h4>
                        {subTasks.map((st, i) => (
                            <Card key={i}>
                                <CardContent className="p-3 flex items-start justify-between gap-4">
                                    <div className="flex-grow">
                                        <p className="font-semibold text-sm">{st.title}</p>
                                        <p className="text-sm text-muted-foreground">{st.description}</p>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0" onClick={() => handleRemoveSubTask(i)}>
                                        <X className="h-4 w-4" />
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                 </ScrollArea>
            )}
        </div>
        
        {subTasks.length > 0 && (
          <DialogFooter className="sm:justify-between">
            <Button variant="ghost" onClick={() => setSubTasks([])}>
                <ListX className="mr-2 h-4 w-4" />
                Clear List
            </Button>
            <Button onClick={handleAddSubTasks}>
                <Plus className="mr-2 h-4 w-4" />
                Add {subTasks.length} Sub-task(s)
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
