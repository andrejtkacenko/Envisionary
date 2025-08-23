
"use client";

import { useState } from "react";
import { Loader2, Sparkles, Wand2, Plus, X, Clock, ListX } from "lucide-react";
import { breakDownGoal } from "@/ai/tools/goal-actions";
import type { Goal } from "@/types";
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
import { Badge } from "@/components/ui/badge";

interface BreakDownGoalDialogProps {
  goal: Goal;
  children: React.ReactNode;
  onSubGoalsAdd: (subGoals: SubGoal[]) => void;
}

export type SubGoal = {
  title: string;
  description: string;
  estimatedTime?: string;
};

export function BreakDownGoalDialog({ goal, children, onSubGoalsAdd }: BreakDownGoalDialogProps) {
  const [open, setOpen] = useState(false);
  const [subGoals, setSubGoals] = useState<SubGoal[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [manualInput, setManualInput] = useState("");
  const { toast } = useToast();

  const handleGenerate = async () => {
    setIsLoading(true);
    try {
      const result = await breakDownGoal({ 
        title: goal.title, 
        description: goal.description 
      });

      if (result.subGoals && result.subGoals.length > 0) {
        setSubGoals(prev => [...prev, ...result.subGoals]);
      } else {
        toast({
            variant: "default",
            title: "No sub-goals generated",
            description: "Try again with a more detailed main goal.",
        });
      }
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not break down the goal. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleAddSubGoals = () => {
    onSubGoalsAdd(subGoals);
    setOpen(false);
  }

  const handleManualAdd = () => {
    if (manualInput.trim() === "") return;
    setSubGoals(prev => [...prev, { title: manualInput.trim(), description: "Manually added task.", estimatedTime: "N/A" }]);
    setManualInput("");
  }

  const handleRemoveSubGoal = (indexToRemove: number) => {
    setSubGoals(prev => prev.filter((_, index) => index !== indexToRemove));
  }
  
  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
        setSubGoals([]);
        setIsLoading(false);
        setManualInput("");
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild onClick={(e) => e.stopPropagation()}>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-2xl" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="font-headline flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-accent" />
            Add Sub-goals
          </DialogTitle>
          <DialogDescription>
            Use AI to break down your goal &quot;{goal.title}&quot; or add sub-goals manually. This will create an execution plan.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-4">
            <div className="flex gap-2">
                <Input 
                    placeholder="Enter a new sub-goal title"
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

            <Button onClick={handleGenerate} disabled={isLoading} className="w-full">
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                Generate Plan with AI
            </Button>
            
            {isLoading && (
                <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground py-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <p>AI is building your plan...</p>
                </div>
            )}
            {subGoals.length > 0 && (
                 <ScrollArea className="h-60 mt-4">
                    <div className="space-y-2 pr-4">
                        <h4 className="text-sm font-medium text-muted-foreground">Execution Plan</h4>
                        {subGoals.map((sg, i) => (
                            <Card key={i}>
                                <CardContent className="p-3 flex items-start justify-between gap-4">
                                    <div className="flex-grow">
                                        <p className="font-semibold text-sm">{sg.title}</p>
                                        <p className="text-sm text-muted-foreground">{sg.description}</p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                      <Badge variant="outline" className="flex-shrink-0">
                                          <Clock className="mr-1.5 h-3 w-3"/>
                                          {sg.estimatedTime}
                                      </Badge>
                                      <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0" onClick={() => handleRemoveSubGoal(i)}>
                                          <X className="h-4 w-4" />
                                      </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                 </ScrollArea>
            )}
        </div>
        
        {subGoals.length > 0 && (
          <DialogFooter className="sm:justify-between">
            <Button variant="ghost" onClick={() => setSubGoals([])}>
                <ListX className="mr-2 h-4 w-4" />
                Clear List
            </Button>
            <Button onClick={handleAddSubGoals}>
                <Plus className="mr-2 h-4 w-4" />
                Add {subGoals.length} Sub-Goal(s)
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
