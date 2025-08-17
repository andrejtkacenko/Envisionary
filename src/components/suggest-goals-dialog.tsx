"use client";

import { useState } from "react";
import { Lightbulb, Loader2, Sparkles } from "lucide-react";
import { suggestGoals, type SuggestedGoal } from "@/ai/flows/suggest-goals";
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
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

export type { SuggestedGoal };

interface SuggestGoalsDialogProps {
  onSuggestionSelect: (suggestion: SuggestedGoal) => void;
}

export function SuggestGoalsDialog({ onSuggestionSelect }: SuggestGoalsDialogProps) {
  const [open, setOpen] = useState(false);
  const [topic, setTopic] = useState("");
  const [suggestions, setSuggestions] = useState<SuggestedGoal[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleGenerateSuggestions = async () => {
    if (!topic) {
        toast({
            variant: "destructive",
            title: "Topic Required",
            description: "Please enter a topic to get suggestions.",
        });
        return;
    }
    setIsLoading(true);
    setSuggestions([]);
    try {
      const result = await suggestGoals({ topic });
      if (result.suggestions && result.suggestions.length > 0) {
        setSuggestions(result.suggestions);
      } else {
        throw new Error("No suggestions were generated.");
      }
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not generate suggestions. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectSuggestion = (suggestion: SuggestedGoal) => {
    onSuggestionSelect(suggestion);
    setOpen(false);
    toast({
        title: "Goal populated!",
        description: "The form has been filled with the suggested goal."
    });
  }

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
        setTopic("");
        setSuggestions([]);
        setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Sparkles className="mr-2 h-4 w-4" />
          Suggest with AI
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-headline">AI Goal Suggester</DialogTitle>
          <DialogDescription>
            Tell the AI what you want to focus on, and it will generate goal ideas for you.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2">
            <Input 
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., 'Learn a new programming language' or 'Improve my fitness'"
                disabled={isLoading}
            />
            <Button onClick={handleGenerateSuggestions} disabled={isLoading}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                <span className="sr-only">Generate</span>
            </Button>
        </div>
        
        <div className="py-4">
            {isLoading && (
                <div className="flex flex-col items-center gap-2 text-muted-foreground py-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <p>Generating goal ideas...</p>
                </div>
            )}
            
            {!isLoading && suggestions.length === 0 && (
                 <div className="flex flex-col items-center gap-4 text-center text-muted-foreground py-8">
                    <Lightbulb className="h-12 w-12" />
                    <p className="max-w-md">Your AI-powered goal suggestions will appear here. Try typing a topic above, like "Read more books" or "Get organized".</p>
                </div>
            )}

            {suggestions.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {suggestions.map((suggestion, index) => (
                        <Card key={index} className="flex flex-col">
                            <CardHeader>
                                <CardTitle className="text-base">{suggestion.title}</CardTitle>
                            </CardHeader>
                            <CardContent className="flex-grow">
                                <p className="text-sm text-muted-foreground">{suggestion.description}</p>
                            </CardContent>
                             <DialogFooter className="p-4 pt-0">
                                <Button size="sm" onClick={() => handleSelectSuggestion(suggestion)} className="w-full">
                                    Use this Goal
                                </Button>
                            </DialogFooter>
                        </Card>
                    ))}
                </div>
            )}
        </div>

      </DialogContent>
    </Dialog>
  );
}
