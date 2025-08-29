

"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useAuth } from "@/context/AuthContext"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Zap, Target, CheckCircle, Clock, ListTodo, Award, ChevronRight, Loader2, Repeat } from "lucide-react"
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
import { getGoals, getSubGoals } from "@/lib/goals-service"
import { summarizeProgress } from "@/ai/tools/goal-actions";
import { useToast } from "@/hooks/use-toast"

const chartColors = [
    "hsl(var(--chart-1))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
    "hsl(var(--chart-5))",
];

export default function DashboardPage() {
  const { appUser } = useAuth()
  const { toast } = useToast();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInsightsLoading, setIsInsightsLoading] = useState(false);
  const [insights, setInsights] = useState<{summary: string} | null>(null);

  useEffect(() => {
    if (appUser) {
      setIsLoading(true);
      getGoals(appUser.firebaseUid)
        .then((userGoals) => {
          setGoals(userGoals);
        })
        .catch((error) => {
          console.error("Failed to fetch goals:", error);
          toast({ variant: 'destructive', title: 'Error fetching goals' });
        })
        .finally(() => setIsLoading(false));
    }
  }, [appUser, toast]);
  
  const handleGenerateInsights = async () => {
    setIsInsightsLoading(true);
    setInsights(null);
    try {
        const taskString = goals
            .map((goal) => `- ${goal.title} (Status: ${goal.status}, Priority: ${goal.priority}, Category: ${goal.category})`)
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

  const { 
    totalCount, 
    doneCount, 
    inprogressCount, 
    todoCount, 
    ongoingCount, 
    recentGoals, 
    categoryData, 
    chartConfig, 
    ongoingGoals 
  } = useMemo(() => {
    const mainGoals = goals.filter(g => !g.parentId);
    const activeGoals = mainGoals.filter(g => g.status !== 'ongoing');
    const ongoings = mainGoals.filter(g => g.status === 'ongoing');

    const total = activeGoals.length;
    const done = activeGoals.filter(g => g.status === 'done').length;
    const inprogress = activeGoals.filter(g => g.status === 'inprogress').length;
    const todo = activeGoals.filter(g => g.status === 'todo').length;
    
    const recent = [...mainGoals].sort((a, b) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }).slice(0, 4);

    const categoryCounts = activeGoals.reduce((acc, goal) => {
      const categoryName = goal.category || "Uncategorized";
      if (!acc[categoryName]) {
        acc[categoryName] = { total: 0, completed: 0 };
      }
      acc[categoryName].total++;
      if (goal.status === 'done') {
        acc[categoryName].completed++;
      }
      return acc;
    }, {} as Record<string, { total: number, completed: number }>);

    const catData = Object.entries(categoryCounts).map(([name, data], index) => ({
        name,
        value: data.total,
        fill: chartColors[index % chartColors.length]
    }));

    const chConfig = catData.reduce((acc, item) => {
        acc[item.name] = { label: item.name, color: item.fill };
        return acc;
    }, {} as any)

    return {
        totalCount: total,
        doneCount: done,
        inprogressCount: inprogress,
        todoCount: todo,
        ongoingCount: ongoings.length,
        recentGoals: recent,
        categoryData: catData,
        chartConfig: chConfig,
        ongoingGoals: ongoings,
    }
  }, [goals]);

  const GoalProgress = ({ goal }: { goal: Goal }) => {
    const [subGoals, setSubGoals] = useState<Goal[]>([]);

    useEffect(() => {
      if (goal.id) {
        getSubGoals(goal.id).then(setSubGoals);
      }
    }, [goal.id]);

    const completedSub = subGoals.filter(sg => sg.status === 'done').length;
    const totalSub = subGoals.length;
    const progress = totalSub > 0 ? (completedSub / totalSub) * 100 : (goal.status === 'done' ? 100 : goal.status === 'inprogress' ? 50 : 0);

    return (
      <div>
        <div className="flex items-center justify-between">
          <Link href="/" className="font-semibold hover:underline">{goal.title}</Link>
          <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>
        </div>
        <p className="text-sm text-muted-foreground">{goal.category || 'Uncategorized'}</p>
        <Progress value={progress} className="h-2 mt-2" />
      </div>
    );
  };


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
            Welcome back, {appUser?.displayName || appUser?.email || 'Achiever'}! 👋
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
      
      {goals.filter(g => !g.parentId).length === 0 ? (
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
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
                <CardTitle className="text-sm font-medium">In Progress</CardTitle>
                <Clock className="h-4 w-4 text-white/70" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{inprogressCount}</div>
            </CardContent>
            </Card>
            <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">To Do</CardTitle>
                <ListTodo className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{todoCount}</div>
            </CardContent>
            </Card>
            <Card className="bg-purple-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ongoing</CardTitle>
                <Repeat className="h-4 w-4 text-white/70" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{ongoingCount}</div>
            </CardContent>
            </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="lg:col-span-4">
            <CardHeader>
                <CardTitle>Goals by Category</CardTitle>
                <CardDescription>Distribution of your active goals across different categories.</CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
                 {categoryData.length > 0 ? (
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
                            {categoryData.map((entry) => (
                                <Cell key={`cell-${entry.name}`} fill={entry.fill} />
                            ))}
                            </Pie>
                            <ChartLegend
                                content={<ChartLegendContent nameKey="name" />}
                            />
                        </PieChart>
                    </ChartContainer>
                 ) : (
                    <div className="flex flex-col items-center justify-center h-[300px] text-center text-muted-foreground">
                        <ListTodo className="h-12 w-12" />
                        <p className="mt-4">Your goals don't have categories yet.</p>
                        <p className="text-sm">Edit a goal to add a category.</p>
                    </div>
                 )}
            </CardContent>
            </Card>
            <Card className="lg:col-span-3">
            <CardHeader>
                <CardTitle>Ongoing Goals & Habits</CardTitle>
                 <CardDescription>Your permanent, long-term objectives.</CardDescription>
            </CardHeader>
            <CardContent>
                {ongoingGoals.length > 0 ? (
                    <div className="space-y-4">
                    {ongoingGoals.map((goal: Goal) => {
                        return (
                        <div key={goal.id}>
                            <Link href="/" className="font-semibold hover:underline">{goal.title}</Link>
                            <p className="text-sm text-muted-foreground">{goal.category || 'Uncategorized'}</p>
                        </div>
                        )
                    })}
                    </div>
                ) : (
                     <div className="text-center text-muted-foreground py-12">
                        <Repeat className="mx-auto h-12 w-12" />
                        <p className="mt-4">No ongoing goals yet. Create one to track your habits!</p>
                    </div>
                )}
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
                {recentGoals.length > 0 ? (
                    <div className="space-y-6">
                    {recentGoals.map((goal: Goal) => (
                      <GoalProgress key={goal.id} goal={goal} />
                    ))}
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
