
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, PlusCircle, User, Clock } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { getGoalTemplates, addGoal } from '@/lib/goals-service';
import type { Goal, GoalTemplate } from '@/types';
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

const systemTemplates: Omit<GoalTemplate, 'id' | 'createdAt' | 'authorId' | 'likes'>[] = [
    {
        title: "Launch a Personal Blog",
        description: "Create and launch a personal blog to share your thoughts and expertise with the world.",
        category: "Creative",
        subGoals: [
            { title: "Define Niche & Target Audience", description: "Research and decide on the main topics for your blog.", estimatedTime: "2 hours" },
            { title: "Choose a Blogging Platform", description: "Select a platform like WordPress, Ghost, or Medium.", estimatedTime: "3 hours" },
            { title: "Brainstorm & Outline 10 Blog Posts", description: "Create a content calendar with initial ideas.", estimatedTime: "4 hours" },
            { title: "Write & Edit First 3 Posts", description: "Draft, revise, and proofread your initial content.", estimatedTime: "6 hours" },
            { title: "Design and Customize Blog", description: "Set up the theme, layout, and branding.", estimatedTime: "5 hours" },
            { title: "Publish & Promote First Post", description: "Go live and share your first article on social media.", estimatedTime: "2 hours" },
        ],
        authorName: "Zenith Flow System",
    },
    {
        title: "Run a 5K Race",
        description: "Train for and successfully complete a 5-kilometer race.",
        category: "Health & Fitness",
        subGoals: [
            { title: "Get Proper Running Shoes", description: "Visit a specialty store to get fitted for the right shoes.", estimatedTime: "1.5 hours" },
            { title: "Follow a 6-Week Training Plan", description: "Commit to a structured running schedule.", estimatedTime: "3-4 times/week" },
            { title: "Incorporate Strength Training", description: "Add bodyweight exercises twice a week to prevent injury.", estimatedTime: "30 mins/session" },
            { title: "Focus on Nutrition & Hydration", description: "Plan healthy meals and drink plenty of water.", estimatedTime: "Daily" },
            { title: "Register for a Local 5K Race", description: "Find and sign up for a race.", estimatedTime: "30 minutes" },
            { title: "Complete the Race!", description: "Enjoy the experience and celebrate your accomplishment.", estimatedTime: "1 hour" },
        ],
        authorName: "Zenith Flow System",
    },
    {
        title: "Learn Basic Spanish",
        description: "Achieve a basic conversational level in Spanish for travel.",
        category: "Learning",
        subGoals: [
            { title: "Complete a Beginner's Language App Course", description: "Use an app like Duolingo or Babbel daily.", estimatedTime: "15 mins/day" },
            { title: "Learn 100 Common Verbs", description: "Use flashcards to memorize essential verbs.", estimatedTime: "3 hours total" },
            { title: "Practice Speaking with a Language Partner", description: "Find a partner online for weekly practice.", estimatedTime: "1 hour/week" },
            { title: "Watch a Spanish TV Show with Subtitles", description: "Immerse yourself in the language and culture.", estimatedTime: "2 hours/week" },
            { title: "Master Basic Greetings & Phrases", description: "Learn how to introduce yourself, ask for directions, and order food.", estimatedTime: "4 hours total" },
        ],
        authorName: "Zenith Flow System",
    },
];

const GoalTemplateCard = ({ template, onAdd }: { template: GoalTemplate, onAdd: (template: GoalTemplate) => void; }) => {
    const [isAdding, setIsAdding] = useState(false);
    
    const handleAddClick = async () => {
        setIsAdding(true);
        await onAdd(template);
        setIsAdding(false);
    }
    
    return (
        <Card className="flex flex-col">
            <CardHeader>
                <div className="flex justify-between items-start">
                    <CardTitle className="font-headline text-xl">{template.title}</CardTitle>
                    <Badge variant="secondary">{template.category || 'Uncategorized'}</Badge>
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
                            <Button onClick={handleAddClick} disabled={isAdding}>
                                {isAdding ? <Loader2 className="h-4 w-4 animate-spin"/> : <PlusCircle className="h-4 w-4" />}
                                Add to My Board
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

            </CardFooter>
        </Card>
    );
}


export default function GoalLibraryPage() {
  const [communityTemplates, setCommunityTemplates] = useState<GoalTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    async function fetchTemplates() {
      try {
        const fetchedTemplates = await getGoalTemplates();
        setCommunityTemplates(fetchedTemplates);
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
    try {
      const parentGoalData = {
        userId: user.uid,
        title: template.title,
        description: template.description,
        category: template.category || 'General',
        status: 'todo' as const,
        priority: 'medium' as const,
      };
      const parentGoal = await addGoal(parentGoalData);

      const subGoalsData = template.subGoals.map(sg => ({
        userId: user.uid,
        parentId: parentGoal.id,
        title: sg.title,
        description: sg.description,
        category: template.category || 'General',
        status: 'todo' as const,
        priority: 'medium' as const,
        estimatedTime: sg.estimatedTime,
      }));

      if (subGoalsData.length > 0) {
        await Promise.all(subGoalsData.map(sg => addGoal(sg)));
      }
      
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
    }
  };
  
  const allSystemTemplates: GoalTemplate[] = systemTemplates.map((t, i) => ({
      ...t,
      id: `system-${i}`,
      authorId: 'system',
      likes: 0,
      createdAt: new Date() as any, // Not a real timestamp, but satisfies type
  }));

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground mt-4">Loading Goal Templates...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* System Templates */}
      <section>
        <h2 className="text-2xl font-headline font-semibold mb-4">
            System Templates
        </h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {allSystemTemplates.map(template => (
                <GoalTemplateCard key={template.id} template={template} onAdd={handleAddGoal} />
            ))}
        </div>
      </section>

      {/* Community Templates */}
      <section>
        <h2 className="text-2xl font-headline font-semibold mb-4">
            Community Templates
        </h2>
        {communityTemplates.length === 0 ? (
            <div className="text-center text-muted-foreground py-12 border rounded-lg bg-card/50">
                <p className="mt-4 text-lg">The Community Library is Empty</p>
                <p className="text-sm">Be the first to share a goal with the community!</p>
            </div>
        ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {communityTemplates.map(template => (
                     <GoalTemplateCard key={template.id} template={template} onAdd={handleAddGoal} />
                ))}
            </div>
        )}
      </section>
    </div>
  );
}
