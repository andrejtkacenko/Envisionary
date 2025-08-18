
"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { Zap, Activity, Star, MessageCircle, Trash2, Headphones, Mic, Info, Briefcase, Aperture, Heart, Clock, User, Send, FileText, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/context/AuthContext';
import { coachChat, CoachChatInput } from '@/ai/flows/coach-chat';
import { createGoal, updateGoal, findGoals } from '@/ai/tools/goal-tools';
import { summarizeProgress, SummarizeProgressOutput } from '@/ai/flows/summarize-progress';
import { getGoals } from '@/lib/goals-service';
import type { Goal } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Loader2 } from 'lucide-react';
import { RecommendGoalsDialog } from '@/components/recommend-goals-dialog';

type ChatMessage = {
    role: 'user' | 'assistant' | 'tool';
    content: string;
    toolRequest?: any;
    toolResult?: any;
};

const callTool = async (toolRequest: any, userId: string): Promise<any> => {
    const toolName = toolRequest.name;
    const args = toolRequest.input;
    args.userId = userId;

    switch (toolName) {
        case 'createGoal':
            return await createGoal(args);
        case 'updateGoal':
            return await updateGoal(args);
        case 'findGoals':
            return await findGoals(args);
        default:
            throw new Error(`Unknown tool: ${toolName}`);
    }
};

export default function CoachPage() {
    const { user } = useAuth();
    const { toast } = useToast();

    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
        { role: 'assistant', content: "Hello! I'm your AI Coach. I can help you manage your goals. Try asking me to create a new goal or improve an existing one. How can I support you today?" }
    ]);
    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isAnalysisLoading, setIsAnalysisLoading] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<SummarizeProgressOutput | null>(null);
    const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);
    const [goals, setGoals] = useState<Goal[]>([]);

    const suggestions = [
        "Create a new goal to learn Next.js",
        "Improve my goal 'read more books'",
        "What are my current goals?",
    ];

    const fetchGoals = useCallback(async () => {
        if (user) {
          getGoals(user.uid).then(setGoals);
        }
    }, [user]);

    useEffect(() => {
        fetchGoals();
    }, [fetchGoals]);

    const handleSendMessage = async (message: string, toolResponse?: any) => {
        if (!user) {
            toast({ variant: 'destructive', title: 'Not authenticated.' });
            return;
        }
        if (!message.trim() && !toolResponse) return;

        let newHistory: ChatMessage[] = [...chatHistory];
        if (toolResponse) {
             newHistory.push(toolResponse);
        } else {
            newHistory.push({ role: 'user', content: message });
            setUserInput('');
        }
        
        setChatHistory(newHistory);
        setIsLoading(true);

        try {
            const result = await coachChat({
                history: newHistory,
                message: message,
                userId: user.uid,
            });

            if (result.toolRequest) {
                 const toolResult = await callTool(result.toolRequest, user.uid);
                 const toolResponseMsg = {
                    role: 'tool' as const,
                    content: `Tool ${result.toolRequest.name} called successfully.`,
                    toolResult: { name: result.toolRequest.name, result: toolResult },
                 };
                 // We send the tool result back to the model for a final response
                 await handleSendMessage(message, toolResponseMsg);
            } else {
                setChatHistory([...newHistory, { role: 'assistant', content: result.response }]);
            }
        } catch (error) {
            console.error("Chat error:", error);
            const errorMessage = "Sorry, I encountered an error. Please try again.";
            toast({ variant: "destructive", title: "Error", description: errorMessage });
            setChatHistory(h => [...h, { role: 'assistant', content: errorMessage }]);
        } finally {
            setIsLoading(false);
            fetchGoals(); // Refresh goals after any interaction in case they changed
        }
    };
    
    const handleAnalyzeProgress = async () => {
        setIsAnalysisLoading(true);
        try {
            const taskString = goals
                .map((goal) => `- ${goal.title} (Status: ${goal.status}, Priority: ${goal.priority})`)
                .join("\n");
            
            const result = await summarizeProgress({ tasks: taskString || "No goals found." });
            setAnalysisResult(result);
            setIsAnalysisModalOpen(true);
        } catch (error) {
            console.error("Analysis error:", error);
            toast({
                variant: "destructive",
                title: "Analysis Failed",
                description: "Could not generate progress analysis.",
            });
        } finally {
            setIsAnalysisLoading(false);
        }
    };
    
    const handleClearChat = () => {
        setChatHistory([
            { role: 'assistant', content: "Hello! I'm your AI Coach. I'm here to help you achieve your goals with personalized insights and recommendations. How can I support you today?" }
        ]);
    };

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
                        <Zap />AI Coach
                    </h1>
                    <p className="text-muted-foreground">
                        Chat with your AI assistant to manage and improve your goals.
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                    <Button variant="outline" onClick={handleAnalyzeProgress} disabled={isAnalysisLoading} className="justify-start">
                        {isAnalysisLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Activity className="mr-2 h-4 w-4" />}
                         Analyze Progress
                    </Button>
                    <RecommendGoalsDialog allGoals={goals}>
                        <Button variant="outline" className="justify-start">
                            <Star className="mr-2 h-4 w-4" /> Get Recommendations
                        </Button>
                    </RecommendGoalsDialog>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Chat Interface */}
                <div className="lg:col-span-2">
                    <Card className="h-full flex flex-col">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="flex items-center gap-2">
                                <MessageCircle /> Chat with AI Coach
                            </CardTitle>
                            <Button variant="outline" size="sm" onClick={handleClearChat}>
                                <Trash2 className="mr-2 h-4 w-4" /> Clear
                            </Button>
                        </CardHeader>
                        <CardContent className="flex-grow flex flex-col gap-4">
                           <ScrollArea className="h-[50vh] lg:h-[500px] w-full pr-4">
                                <div className="space-y-6">
                                    {chatHistory.map((msg, index) => {
                                        if (msg.role === 'tool') {
                                            return (
                                                <div key={index} className="text-xs text-center text-muted-foreground flex items-center gap-2 justify-center">
                                                    <Wand2 className="h-4 w-4" />
                                                    <span>Tool action: `{msg.toolResult?.name}` executed.</span>
                                                    <Button variant="link" size="sm" onClick={fetchGoals} className="text-xs p-0 h-auto">Refresh Board</Button>
                                                </div>
                                            )
                                        }
                                        return (
                                            <div key={index} className={cn("flex items-start gap-3", msg.role === 'user' && "flex-row-reverse")}>
                                                <Avatar>
                                                    <AvatarImage src={msg.role === 'user' ? user?.photoURL ?? '' : ''} data-ai-hint="user avatar" />
                                                    <AvatarFallback>
                                                        {msg.role === 'user' ? (user?.email?.[0]?.toUpperCase() ?? <User/>) : <Zap/>}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className={cn("p-3 rounded-lg max-w-sm", msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                                                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                                </div>
                                            </div>
                                        )
                                    })}
                                     {isLoading && (
                                        <div className="flex items-start gap-3">
                                             <Avatar>
                                                <AvatarFallback><Zap/></AvatarFallback>
                                            </Avatar>
                                             <div className="p-3 rounded-lg bg-muted">
                                                <Loader2 className="h-5 w-5 animate-spin" />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>
                            <div className="flex flex-col gap-2">
                                <div className="flex gap-2 flex-wrap">
                                    {suggestions.map((s) => (
                                        <Button key={s} variant="outline" size="sm" onClick={() => handleSendMessage(s)} disabled={isLoading}>
                                            {s}
                                        </Button>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <Input
                                        value={userInput}
                                        onChange={(e) => setUserInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage(userInput)}
                                        placeholder="Ask me anything..."
                                        disabled={isLoading}
                                    />
                                    <Button onClick={() => handleSendMessage(userInput)} disabled={isLoading}>
                                        <Send className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Headphones /> Audio Overview</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground mb-4">Generate an audio summary of your progress or notes for listening on-the-go.</p>
                             <Button variant="outline" className="w-full" disabled>
                                <Mic className="mr-2 h-4 w-4" /> Generate Audio Script
                            </Button>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Zap /> Quick Actions</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 gap-2">
                            <Button variant="outline" size="sm" disabled><FileText className="mr-2 h-4 w-4" />Summarize Notes</Button>
                            <Button variant="outline" size="sm" disabled><Briefcase className="mr-2 h-4 w-4" />Work Advice</Button>
                            <Button variant="outline" size="sm" disabled><Aperture className="mr-2 h-4 w-4" />Creativity Tips</Button>
                            <Button variant="outline" size="sm" disabled><Heart className="mr-2 h-4 w-4" />Health Insights</Button>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Clock /> Recent Insights</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">No recent insights. Start a conversation to see insights here.</p>
                        </CardContent>
                    </Card>
                </div>
            </div>
            
            {/* Analysis Modal */}
            <Dialog open={isAnalysisModalOpen} onOpenChange={setIsAnalysisModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                    <DialogTitle className="font-headline">AI Progress Analysis</DialogTitle>
                    <DialogDescription>
                        Here's a summary of your progress based on your goals.
                    </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <p className="text-sm whitespace-pre-wrap">{analysisResult?.summary}</p>
                    </div>
                    <DialogFooter>
                    <Button onClick={() => setIsAnalysisModalOpen(false)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
