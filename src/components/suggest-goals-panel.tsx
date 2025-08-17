"use client";

import { useState, useEffect } from "react";
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

export function SuggestGoalsPanel({ onSuggestionSelect }: SuggestGoalsPanelProps) {
  const [suggestions, setSuggestions] = useState<SuggestedGoal[]>([]);
  const [isLoading, setIsLoading] = useState(true); // Start loading initially
  const { toast } = useToast();

  const form = useForm<SuggestFormValues>({
    resolver: zodResolver(suggestSchema),
    defaultValues: { topic: "" },
  });
  
  const generateSuggestions = async (topic: string) => {
    setIsLoading(true);
    setSuggestions([]);
    try {
      const result = await suggestGoals({ topic });
      if (result.suggestions && result.suggestions.length > 0) {
        setSuggestions(result.suggestions);
      } else {
        // If no suggestions, show a toast but don't throw an error
        // to avoid breaking the initial load.
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
    }
  };

  useEffect(() => {
    generateSuggestions("popular life goals");
  }, []);


  const handleFormSubmit = (data: SuggestFormValues) => {
    generateSuggestions(data.topic);
  };

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
              {isLoading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</>
              ) : (
                'Generate Custom Goals'
              )}
            </Button>
          </form>
        </Form>
        
        <div className="mt-6 space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">
              {isLoading ? "Loading popular goals..." : "Click a suggestion to use it:"}
            </h3>
            {isLoading && (
              <div className="space-y-2">
                <Skeleton className="h-[68px] w-full" />
                <Skeleton className="h-[68px] w-full" />
                <Skeleton className="h-[68px] w-full" />
              </div>
            )}
            {!isLoading && suggestions.map((s, i) => (
              <Card key={i} className="p-3 hover:bg-muted cursor-pointer" onClick={() => handleSelect(s)}>
                  <p className="font-semibold text-sm">{s.title}</p>
                  <p className="text-sm text-muted-foreground">{s.description}</p>
              </Card>
            ))}
          </div>
      </CardContent>
    </Card>
  );
}
