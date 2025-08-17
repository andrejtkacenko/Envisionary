"use client";

import { useState } from "react";
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
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<SuggestFormValues>({
    resolver: zodResolver(suggestSchema),
    defaultValues: { topic: "" },
  });

  const handleGenerateSuggestions = async (data: SuggestFormValues) => {
    setIsLoading(true);
    setSuggestions([]);
    try {
      const result = await suggestGoals({ topic: data.topic });
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

  const handleSelect = (suggestion: SuggestedGoal) => {
    onSuggestionSelect(suggestion);
  };

  return (
    <Card className="sticky top-24">
      <CardHeader>
        <CardTitle className="font-headline flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-accent" />
            Suggest with AI
        </CardTitle>
        <CardDescription>
          Tell the AI a topic, and it will generate a few goals for you.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleGenerateSuggestions)} className="space-y-4">
            <FormField
              control={form.control}
              name="topic"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Topic</FormLabel>
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
                'Generate Goals'
              )}
            </Button>
          </form>
        </Form>
        
        {suggestions.length > 0 && (
          <div className="mt-6 space-y-2">
             <h3 className="text-sm font-medium text-muted-foreground">Click a suggestion to use it:</h3>
            {suggestions.map((s, i) => (
              <Card key={i} className="p-3 hover:bg-muted cursor-pointer" onClick={() => handleSelect(s)}>
                  <p className="font-semibold text-sm">{s.title}</p>
                  <p className="text-sm text-muted-foreground">{s.description}</p>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
