
"use client";

import { useState } from "react";
import { Loader2, Sparkles, Wand2, Plus } from "lucide-react";
import { breakDownGoal, BreakDownGoalOutput } from "@/ai/flows/break-down-goal";
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
import { useToast } from "@/hooks/use-toast";

interface BreakDownGoalDialogProps {
  goal: Goal;
  children: React.ReactNode;
  onGoalUpdate: (goal: Goal) => void;
}

type SubGoal = BreakDownGoalOutput["subGoals"][0];

export function BreakDownGoalDialog({ goal, children, onGoalUpdate }: BreakDownGoalDialogProps) {
  const [open, setOpen] = useState(false);
  const [subGoals, setSubGoals] = useState<SubGoal[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleGenerate = async () => {
    setIsLoading(true);
    setSubGoals([]);
    try {
      const result = await breakDownGoal({ 
        title: goal.title, 
        description: goal.description 
      });

      if (result.subGoals && result.subGoals.length > 0) {
        setSubGoals(result.subGoals);
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
    const newSubGoals: Goal[] = subGoals.map(sg => ({
      id: crypto.randomUUID(),
      title: sg.title,
      description: sg.description,
      project: goal.project,
      status: 'todo',
      priority: goal.priority,
      dueDate: goal.dueDate
    }));

    const updatedParentGoal = {
        ...goal,
        subGoals: [...(goal.subGoals || []), ...newSubGoals]
    };
    
    onGoalUpdate(updatedParentGoal);

    setOpen(false);
    toast({
        title: "Sub-goals Added",
        description: `${newSubGoals.length} new sub-goals have been added to "${goal.title}".`
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-headline flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-accent" />
            Break Down Goal
          </DialogTitle>
          <DialogDescription>
            Use AI to break down your goal &quot;{goal.title}&quot; into smaller, manageable sub-goals.
          </DialogDescription>
        </DialogHeader>

        <div className="my-4">
            {!isLoading && subGoals.length === 0 && (
                <div className="flex flex-col items-center justify-center gap-4 text-center py-8">
                    <p className="text-muted-foreground">Ready to break this goal down into smaller tasks?</p>
                    <Button onClick={handleGenerate}>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Generate Sub-Goals
                    </Button>
                </div>
            )}
            {isLoading && (
                <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground py-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <p>AI is working its magic...</p>
                </div>
            )}
            {subGoals.length > 0 && (
                 <ScrollArea className="h-72">
                    <div className="space-y-2 pr-4">
                        {subGoals.map((sg, i) => (
                            <Card key={i}>
                                <CardContent className="p-3">
                                    <p className="font-semibold text-sm">{sg.title}</p>
                                    <p className="text-sm text-muted-foreground">{sg.description}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                 </ScrollArea>
            )}
        </div>
        
        {subGoals.length > 0 && (
          <DialogFooter>
            <Button variant="outline" onClick={handleGenerate} disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                Regenerate
            </Button>
            <Button onClick={handleAddSubGoals}>
                <Plus className="mr-2 h-4 w-4" />
                Add Sub-Goals to &quot;{goal.title}&quot;
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
