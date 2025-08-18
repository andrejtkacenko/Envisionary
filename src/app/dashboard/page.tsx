
"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/context/AuthContext"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Zap, Target, CheckCircle, Clock, Star, Award, ChevronRight, Loader2 } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import Link from "next/link"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart"
import { PieChart, Pie, Cell } from "recharts"
import type { Goal } from "@/types"
import { getGoals } from "@/lib/goals-service"
import { summarizeProgress, SummarizeProgressOutput } from "@/ai/flows/summarize-progress";
import { useToast } from "@/hooks/use-toast"
import { calculateGoalStats } from "@/lib/goal-stats"

const chartConfig = {
  completed: {
    label: "Completed",
    color: "hsl(var(--chart-2))",
  },
  inprogress: {
    label: "In Progress",
    color: "hsl(var(--chart-4))",
  },
  todo: {
    label: "To Do",
    color: "hsl(var(--muted))",
  },
}

export default function DashboardPage() {
  const { user } = useAuth()
  const { toast } = useToast();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInsightsLoading, setIsInsightsLoading] = useState(false);
  const [insights, setInsights] = useState<SummarizeProgressOutput | null>(null);

  useEffect(() => {
    if (user) {
      const fetchGoals = async () => {
        setIsLoading(true);
        try {
          const userGoals = await getGoals(user.uid);
          setGoals(userGoals);
        } catch (error) {
          console.error("Error fetching goals:", error);
        } finally {
          setIsLoading(false);
        }
      };
      fetchGoals();
    }
  }, [user]);
  
  const handleGenerateInsights = async () => {
    setIsInsightsLoading(true);
    setInsights(null);
    try {
        const taskString = goals
            .map((goal) => `- ${goal.title} (Status: ${goal.status}, Priority: ${goal.priority})`)
            .join("\n");
        
        const result = await summarizeProgress({ tasks: taskString || "No goals found." });
        setInsights(result);
    } catch (error) {
        console.error("Analysis error:", error);
        toast({
            variant: "destructive",
            title: "Analysis Failed",
            description: "Could not generate progress analysis.",
        });
    } finally {
        setIsInsightsLoading(false);
    }
  };

  const { totalCount, doneCount, inprogressCount } = calculateGoalStats(goals);
  const recentGoals = goals.slice(-4).reverse();

  const categoryProgress = goals.reduce((acc, goal) => {
    const projectName = goal.project || "Uncategorized";
    if (!acc[projectName]) {
      acc[projectName] = { total: 0, completed: 0, name: projectName };
    }
    acc[projectName].total++;
    if (goal.status === 'done') {
      acc[projectName].completed++;
    }
    return acc;
  }, {} as Record<string, { name: string, total: number; completed: number }>);


  const categoryData = Object.values(categoryProgress).map((data, index) => ({
    name: data.name,
    value: data.total,
    fill: `hsl(var(--chart-${(index % 5) + 1}))`
  }));
  
  const chartData = [
    { name: "Completed", value: doneCount, fill: "hsl(var(--chart-2))" },
    { name: "In Progress", value: inprogressCount, fill: "hsl(var(--chart-4))" },
    { name: "To Do", value: totalCount - doneCount - inprogressCount, fill: "hsl(var(--muted))" },
  ]

  if (isLoading) {
    return (
      <div className="flex min-h-screen w-full flex-col bg-background items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }


  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight font-headline">
            Welcome back, {user?.displayName || user?.email || 'Achiever'}! 👋
          </h1>
          <p className="text-muted-foreground">
            Here's your progress overview and latest insights.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={handleGenerateInsights} disabled={isInsightsLoading}>
            {isInsightsLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
            Generate Insights
          </Button>
        </div>
      </div>
      
      {goals.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[calc(100vh-15rem)] gap-4 text-center border bg-card rounded-lg">
            <Target className="h-16 w-16 text-muted-foreground" />
            <h2 className="text-2xl font-semibold">Your Dashboard is Waiting</h2>
            <p className="text-muted-foreground max-w-sm">
                Create your first goal to see your progress and insights here.
            </p>
            <Button asChild>
                <Link href="/create-goal">
                    <Plus className="mr-2 h-4 w-4" /> Create New Goal
                </Link>
            </Button>
        </div>
      ) : (
      <>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="bg-primary text-primary-foreground">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Goals</CardTitle>
                <Target className="h-4 w-4 text-primary-foreground/70" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{totalCount}</div>
            </CardContent>
            </Card>
            <Card className="bg-green-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completed</CardTitle>
                <CheckCircle className="h-4 w-4 text-white/70" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{doneCount}</div>
            </CardContent>
            </Card>
            <Card className="bg-yellow-500 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Goals</CardTitle>
                <Clock className="h-4 w-4 text-white/70" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{inprogressCount}</div>
            </CardContent>
            </Card>
            <Card className="bg-sky-500 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Level</CardTitle>
                <Star className="h-4 w-4 text-white/70" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">1</div>
                <p className="text-xs text-white/70">0 Points</p>
            </CardContent>
            </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="lg:col-span-4">
            <CardHeader>
                <CardTitle>Progress by Category</CardTitle>
            </CardHeader>
            <CardContent className="pl-2">
                <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
                <PieChart>
                    <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent hideLabel />}
                    />
                    <Pie
                    data={categoryData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={80}
                    strokeWidth={5}
                    >
                    {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                    </Pie>
                    <ChartLegend
                    content={<ChartLegendContent nameKey="name" />}
                    />
                </PieChart>
                </ChartContainer>
            </CardContent>
            </Card>
            <Card className="lg:col-span-3">
            <CardHeader>
                <CardTitle>Recent Achievements</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-center text-muted-foreground py-12">
                    <Award className="mx-auto h-12 w-12" />
                    <p className="mt-4">No achievements yet. Complete your first goal to earn a badge!</p>
                </div>
            </CardContent>
            </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="lg:col-span-4">
            <CardHeader className="flex flex-row items-center">
                <div className="grid gap-2">
                    <CardTitle>Recent Goals</CardTitle>
                    <CardDescription>
                        An overview of your most recent goals.
                    </CardDescription>
                </div>
                <Button asChild size="sm" className="ml-auto gap-1">
                    <Link href="/">
                        View All
                        <ChevronRight className="h-4 w-4" />
                    </Link>
                </Button>
            </CardHeader>
            <CardContent>
                {goals.length > 0 ? (
                    <div className="space-y-6">
                    {recentGoals.map((goal: Goal) => {
                        const completedSub = goal.subGoals?.filter(sg => sg.status === 'done').length || 0
                        const totalSub = goal.subGoals?.length || 0
                        const progress = totalSub > 0 ? (completedSub / totalSub) * 100 : (goal.status === 'done' ? 100 : goal.status === 'inprogress' ? 50 : 0)
                        
                        return (
                        <div key={goal.id}>
                            <div className="flex items-center justify-between">
                            <Link href="/" className="font-semibold hover:underline">{goal.title}</Link>
                            <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>
                            </div>
                            <p className="text-sm text-muted-foreground">{goal.project}</p>
                            <Progress value={progress} className="h-2 mt-2" />
                        </div>
                        )
                    })}
                    </div>
                ) : (
                    <div className="text-center text-muted-foreground py-12">
                        <Target className="mx-auto h-12 w-12" />
                        <p className="mt-4">No goals yet. Create one to get started!</p>
                    </div>
                )}
            </CardContent>
            </Card>

            <Card className="lg:col-span-3">
            <CardHeader>
                <CardTitle>AI Insights</CardTitle>
            </CardHeader>
            <CardContent>
                {isInsightsLoading ? (
                    <div className="text-center text-muted-foreground py-12">
                        <Loader2 className="mx-auto h-12 w-12 animate-spin" />
                        <p className="mt-4">AI is analyzing your progress...</p>
                    </div>
                ) : insights ? (
                    <p className="text-sm whitespace-pre-wrap">{insights.summary}</p>
                ) : (
                    <div className="text-center text-muted-foreground py-12">
                        <Zap className="mx-auto h-12 w-12" />
                        <p className="mt-4">No insights generated yet. Click the button above to get personalized AI insights!</p>
                    </div>
                )}
            </CardContent>
            </Card>
        </div>
      </>
      )}
    </div>
  );
}
