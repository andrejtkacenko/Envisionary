
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, PlusCircle, Library, User, BadgeCheck, Clock } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { getGoalTemplates, addGoal } from '@/lib/goals-service';
import type { GoalTemplate } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";

export default function LibraryPage() {
  const [templates, setTemplates] = useState<GoalTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    async function fetchTemplates() {
      try {
        const fetchedTemplates = await getGoalTemplates();
        // Sort by most recent first
        fetchedTemplates.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
        setTemplates(fetchedTemplates);
      } catch (error) {
        console.error("Failed to fetch goal templates:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Could not load the goal library.",
        });
      } finally {
        setIsLoading(false);
      }
    }
    fetchTemplates();
  }, [toast]);

  const handleAddGoal = async (template: GoalTemplate) => {
    if (!user) {
      toast({ variant: 'destructive', title: 'You must be logged in.' });
      return;
    }
    setIsAdding(template.id);
    try {
      await addGoal(user.uid, {
        title: template.title,
        description: template.description,
        project: template.project || 'General',
        status: 'todo',
        priority: 'medium',
        subGoals: template.subGoals.map(sg => ({
            id: crypto.randomUUID(),
            title: sg.title,
            description: sg.description,
            project: template.project || 'General',
            status: 'todo',
            priority: 'medium',
        }))
      });
      toast({
        title: 'Goal Added!',
        description: `"${template.title}" has been added to your board.`,
      });
      router.push('/');
    } catch (e) {
      console.error(e);
      toast({
        variant: 'destructive',
        title: 'Failed to add goal',
        description: 'An error occurred while adding the goal.',
      });
    } finally {
        setIsAdding(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen w-full flex-col bg-background items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground mt-4">Loading Goal Library...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
            <Library /> Goal Library
          </h1>
          <p className="text-muted-foreground">
            Browse and import goals shared by the community.
          </p>
        </div>
      </div>
      
      {templates.length === 0 ? (
        <div className="text-center text-muted-foreground py-24">
            <Library className="mx-auto h-16 w-16" />
            <p className="mt-4 text-lg">The Library is Empty</p>
            <p>Be the first to share a goal with the community!</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {templates.map(template => (
            <Card key={template.id} className="flex flex-col">
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <CardTitle className="font-headline text-xl">{template.title}</CardTitle>
                        <Badge variant="secondary">{template.project || 'Uncategorized'}</Badge>
                    </div>
                    <CardDescription>{template.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow">
                    <p className="text-sm font-medium text-muted-foreground">
                        Plan includes {template.subGoals.length} sub-goals.
                    </p>
                </CardContent>
                <CardFooter className="flex justify-between items-center">
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <User className="h-3 w-3" />
                        <span>By {template.authorName}</span>
                    </div>
                    
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="sm">View Plan</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle className="font-headline">{template.title}</DialogTitle>
                                <DialogDescription>{template.description}</DialogDescription>
                            </DialogHeader>
                            <div className="py-4 space-y-3 max-h-96 overflow-y-auto">
                                <h4 className="font-semibold">Execution Plan:</h4>
                                {template.subGoals.map((sg, index) => (
                                    <div key={index} className="p-3 bg-muted/50 rounded-md">
                                        <p className="font-semibold text-sm">{sg.title}</p>
                                        <p className="text-xs text-muted-foreground">{sg.description}</p>
                                        <div className="flex items-center text-xs text-muted-foreground mt-1">
                                            <Clock className="h-3 w-3 mr-1.5"/>
                                            <span>Est. Time: {sg.estimatedTime}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <DialogFooter>
                                <Button onClick={() => handleAddGoal(template)} disabled={isAdding === template.id}>
                                    {isAdding === template.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <PlusCircle className="h-4 w-4" />}
                                    Add to My Board
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                </CardFooter>
            </Card>
            ))}
        </div>
      )}
    </div>
  );
}
