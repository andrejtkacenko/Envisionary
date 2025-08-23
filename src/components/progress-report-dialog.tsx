
"use client";

import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import type { Goal } from "@/types";
import { summarizeProgress } from "@/ai/tools/goal-actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface ProgressReportDialogProps {
  allGoals: Goal[];
}

export function ProgressReportDialog({ allGoals }: ProgressReportDialogProps) {
  const [open, setOpen] = useState(false);
  const [summary, setSummary] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleGenerateReport = async () => {
    setIsLoading(true);
    setSummary("");
    try {
      const taskString = allGoals
        .map((goal) => `- ${goal.title} (Status: ${goal.status}, Priority: ${goal.priority})`)
        .join("\n");
      
      const result = await summarizeProgress({ tasks: taskString });
      if (result.summary) {
        setSummary(result.summary);
      } else {
        throw new Error("Failed to generate summary.");
      }
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not generate the progress report. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Sparkles className="mr-2 h-4 w-4" />
          Progress Report
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-headline">AI Progress Report</DialogTitle>
          <DialogDescription>
            Get an AI-generated summary of your current progress across all your goals.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center gap-4 py-8">
            {!summary && !isLoading && (
                 <Button onClick={handleGenerateReport} disabled={isLoading}>
                    {isLoading ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</>
                    ) : (
                        <><Sparkles className="mr-2 h-4 w-4" /> Generate Summary</>
                    )}
                </Button>
            )}

            {isLoading && (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <p>Analyzing your progress...</p>
                </div>
            )}
            
            {summary && (
                <div className="w-full p-4 bg-secondary/50 rounded-lg text-sm text-secondary-foreground space-y-4">
                    <p className="whitespace-pre-wrap font-sans">{summary}</p>
                    <Button variant="outline" size="sm" onClick={handleGenerateReport} disabled={isLoading} className="w-full">
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                        Regenerate
                    </Button>
                </div>
            )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
