"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { suggestGoals } from "@/ai/flows/suggest-goals";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Skeleton } from "./ui/skeleton";
import { ScrollArea } from "./ui/scroll-area";

const suggestSchema = z.object({
  topic: z.string().min(3, "Topic must be at least 3 characters long."),
});

type SuggestFormValues = z.infer<typeof suggestSchema>;

export type SuggestedGoal = {
  title: string;
  description: string;
};

interface SuggestGoalsPanelProps {
  onSuggestionSelect: (suggestion: SuggestedGoal) => void;
}

const suggestionTopics = [
    "popular life goals",
    "career development",
    "health and fitness",
    "creative skills",
    "financial planning",
    "mindfulness and well-being",
];

export function SuggestGoalsPanel({ onSuggestionSelect }: SuggestGoalsPanelProps) {
  const [suggestions, setSuggestions] = useState<SuggestedGoal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAppending, setIsAppending] = useState(false);
  const [topicIndex, setTopicIndex] = useState(0);
  const { toast } = useToast();

  const form = useForm<SuggestFormValues>({
    resolver: zodResolver(suggestSchema),
    defaultValues: { topic: "" },
  });
  
  const generateSuggestions = useCallback(async (topic: string, append = false) => {
    if (!append) {
      setIsLoading(true);
      setSuggestions([]);
    } else {
      setIsAppending(true);
    }
    
    try {
      const result = await suggestGoals({ topic });
      if (result.suggestions && result.suggestions.length > 0) {
        if (append) {
            setSuggestions(prev => [...prev, ...result.suggestions]);
        } else {
            setSuggestions(result.suggestions);
        }
      } else {
        toast({
            variant: "default",
            title: "No suggestions found",
            description: "Try a different topic.",
        });
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
      setIsAppending(false);
    }
  }, [toast]);

  useEffect(() => {
    // Initial load
    generateSuggestions(suggestionTopics[0]);
    setTopicIndex(1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const handleFormSubmit = (data: SuggestFormValues) => {
    generateSuggestions(data.topic);
  };

  const handleLoadMore = () => {
    generateSuggestions(suggestionTopics[topicIndex % suggestionTopics.length], true);
    setTopicIndex(prev => prev + 1);
  }

  const handleSelect = (suggestion: SuggestedGoal) => {
    onSuggestionSelect(suggestion);
  };

  return (
    <Card className="sticky top-24">
      <CardHeader>
        <CardTitle className="font-headline flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-accent" />
            AI Goal Suggestions
        </CardTitle>
        <CardDescription>
          Get inspiration from popular goals, or enter a topic to generate your own.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="topic"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Custom Topic</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Learn to cook" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading && !isAppending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</>
              ) : (
                'Generate Custom Goals'
              )}
            </Button>
          </form>
        </Form>
        
        <div className="mt-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">
              {isLoading && !isAppending ? "Loading popular goals..." : "Click a suggestion to use it:"}
            </h3>
            <ScrollArea className="h-[400px] pr-4">
              {isLoading && !isAppending && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-[68px] w-full" />)}
                </div>
              )}
              {!isLoading && suggestions.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {suggestions.map((s, i) => (
                    <Card key={i} className="p-3 hover:bg-muted cursor-pointer" onClick={() => handleSelect(s)}>
                        <p className="font-semibold text-sm">{s.title}</p>
                        <p className="text-sm text-muted-foreground">{s.description}</p>
                    </Card>
                  ))}
                </div>
              )}
              <div className="mt-4">
                  <Button onClick={handleLoadMore} disabled={isAppending || isLoading} className="w-full" variant="outline">
                      {isAppending ? (
                          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading...</>
                      ) : (
                          'Load More'
                      )}
                  </Button>
              </div>
            </ScrollArea>
          </div>
      </CardContent>
    </Card>
  );
}
