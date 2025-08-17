
"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/context/AuthContext"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Zap, Target, CheckCircle, Clock, Star, Award, ChevronRight } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import Link from "next/link"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart"
import { PieChart, Pie } from "recharts"
import { mockTasks } from "@/lib/mock-data"
import type { Goal } from "@/types"

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
  const [goals, setGoals] = useState<Goal[]>(mockTasks);

  useEffect(() => {
    const storedGoals = sessionStorage.getItem('goals');
    if (storedGoals) {
      try {
        const parsedGoals = JSON.parse(storedGoals, (key, value) => {
            if ((key === 'dueDate' || key.endsWith('Date')) && value) {
                return new Date(value);
            }
            return value;
        });
        setGoals(parsedGoals);
      } catch (e) {
        console.error("Failed to parse goals from session storage", e);
        setGoals(mockTasks);
      }
    }
  }, []);


  // Process goal data for stats and charts
  const totalGoals = goals.length
  const completedGoals = goals.filter(g => g.status === 'done').length
  const activeGoals = goals.filter(g => g.status === 'inprogress').length
  const recentGoals = goals.slice(-4).reverse()

  const categoryProgress = goals.reduce((acc, goal) => {
    if (!acc[goal.project]) {
      acc[goal.project] = { total: 0, completed: 0 }
    }
    acc[goal.project].total++
    if (goal.status === 'done') {
      acc[goal.project].completed++
    }
    return acc
  }, {} as Record<string, { total: number; completed: number }>)

  const categoryData = Object.entries(categoryProgress).map(([name, data], index) => ({
    name,
    value: data.completed,
    fill: `hsl(var(--chart-${(index % 5) + 1}))`
  }));
  
  const chartData = [
    { name: "Completed", value: completedGoals, fill: "hsl(var(--chart-2))" },
    { name: "In Progress", value: activeGoals, fill: "hsl(var(--chart-4))" },
    { name: "To Do", value: goals.filter(g => g.status === 'todo').length, fill: "hsl(var(--muted))" },
  ]


  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">
            Welcome back, {user?.displayName || user?.email || 'Achiever'}! 👋
          </h1>
          <p className="text-muted-foreground">
            Here's your progress overview and latest insights.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline">
            <Zap />
            Generate Insights
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-primary text-primary-foreground">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Goals</CardTitle>
            <Target className="h-4 w-4 text-primary-foreground/70" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalGoals}</div>
          </CardContent>
        </Card>
        <Card className="bg-green-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-white/70" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedGoals}</div>
          </CardContent>
        </Card>
        <Card className="bg-yellow-500 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Goals</CardTitle>
            <Clock className="h-4 w-4 text-white/70" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeGoals}</div>
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
             <div className="text-center text-muted-foreground py-12">
                <Zap className="mx-auto h-12 w-12" />
                <p className="mt-4">No insights generated yet. Click the button above to get personalized AI insights!</p>
             </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  