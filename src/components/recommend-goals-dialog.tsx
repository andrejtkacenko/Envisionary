
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles, Plus } from "lucide-react";
import type { Goal } from "@/types";
import { recommendGoals, RecommendGoalsOutput } from "@/ai/flows/recommend-goals";
import { useAuth } from "@/context/AuthContext";
import { addGoals } from "@/lib/goals-service";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface RecommendGoalsDialogProps {
  allGoals: Goal[];
  children: React.ReactNode;
}

type RecommendedGoal = RecommendGoalsOutput["recommendations"][0];

export function RecommendGoalsDialog({ allGoals, children }: RecommendGoalsDialogProps) {
  const [open, setOpen] = useState(false);
  const [recommendations, setRecommendations] = useState<RecommendedGoal[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const handleGenerate = async () => {
    setIsLoading(true);
    setRecommendations([]);
    try {
      const existingGoalsString = allGoals
        .map((goal) => `- ${goal.title} (Category: ${goal.category || 'N/A'}, Status: ${goal.status})`)
        .join("\n");
      
      const result = await recommendGoals({ existingGoals: existingGoalsString || "No existing goals." });

      if (result.recommendations && result.recommendations.length > 0) {
        setRecommendations(result.recommendations);
      } else {
        toast({
          variant: "default",
          title: "No recommendations generated",
          description: "The AI couldn't find any recommendations at this time.",
        });
      }
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not generate recommendations. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddGoals = async () => {
    if (!user) {
      toast({ variant: "destructive", title: "Not authenticated" });
      return;
    }
    
    setIsLoading(true);
    try {
        const goalsToAdd = recommendations.map(rec => ({
            ...rec,
            category: rec.project,
            status: 'todo' as const,
        }));
      await addGoals(user.uid, goalsToAdd);
      toast({
        title: "Goals Added!",
        description: `${recommendations.length} new goals have been added to your board.`,
      });
      router.push('/?newGoals=true');
      setOpen(false);
    } catch (e) {
      console.error(e);
      toast({
        variant: "destructive",
        title: "Failed to add goals",
        description: "Could not add the recommended goals.",
      });
    } finally {
        setIsLoading(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setRecommendations([]);
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-headline flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-accent" />
            AI Goal Recommendations
          </DialogTitle>
          <DialogDescription>
            Get new goal ideas based on your current objectives. Click "Generate" to start.
          </DialogDescription>
        </DialogHeader>

        <div className="my-4">
          {!recommendations.length && !isLoading && (
            <div className="flex justify-center py-8">
              <Button onClick={handleGenerate} disabled={isLoading}>
                {isLoading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</>
                ) : (
                  <><Sparkles className="mr-2 h-4 w-4" /> Generate Recommendations</>
                )}
              </Button>
            </div>
          )}

          {isLoading && (
            <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p>AI is analyzing your goals...</p>
            </div>
          )}

          {recommendations.length > 0 && (
            <ScrollArea className="h-96">
              <div className="space-y-3 pr-4">
                {recommendations.map((rec, i) => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <h4 className="font-semibold text-base mb-1">{rec.title}</h4>
                        <Badge variant={rec.priority === 'high' ? 'destructive' : rec.priority === 'medium' ? 'secondary' : 'outline'}>
                            {rec.priority}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{rec.description}</p>
                      <Badge variant="secondary">{rec.project}</Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
        
        {recommendations.length > 0 && !isLoading && (
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => handleGenerate()} disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                Regenerate
            </Button>
            <Button onClick={handleAddGoals} disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Add {recommendations.length} Goal(s)
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
