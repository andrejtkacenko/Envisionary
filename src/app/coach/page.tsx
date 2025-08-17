
"use client";

import { useState, useEffect, useRef } from 'react';
import { Zap, Activity, Star, MessageCircle, Trash2, Headphones, Mic, Info, Briefcase, Aperture, Heart, Clock, User, Send, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/context/AuthContext';
import { coachChat, CoachChatInput } from '@/ai/flows/coach-chat';
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
    role: 'user' | 'assistant';
    content: string;
};

export default function CoachPage() {
    const { user } = useAuth();
    const { toast } = useToast();

    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
        { role: 'assistant', content: "Hello! I'm your AI Coach. I'm here to help you achieve your goals with personalized insights and recommendations. How can I support you today?" }
    ]);
    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isAnalysisLoading, setIsAnalysisLoading] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<SummarizeProgressOutput | null>(null);
    const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);
    
    const [goals, setGoals] = useState<Goal[]>([]);

    useEffect(() => {
        if (user) {
            getGoals(user.uid).then(setGoals);
        }
    }, [user]);

    const handleSendMessage = async () => {
        if (!userInput.trim()) return;

        const newHistory: ChatMessage[] = [...chatHistory, { role: 'user', content: userInput }];
        setChatHistory(newHistory);
        setUserInput('');
        setIsLoading(true);

        try {
            const result = await coachChat({
                history: newHistory.slice(0, -1), // Send history without the latest user message
                message: userInput,
            });

            setChatHistory([...newHistory, { role: 'assistant', content: result.response }]);
        } catch (error) {
            console.error("Chat error:", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to get a response from the AI coach.",
            });
            setChatHistory(h => [...h, { role: 'assistant', content: "Sorry, I encountered an error. Please try again." }]);
        } finally {
            setIsLoading(false);
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
            <div className="flex items-center justify-between space-y-2">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
                        <Zap />AI Coach
                    </h1>
                    <p className="text-muted-foreground">
                        Get personalized insights, recommendations, and coaching support.
                    </p>
                </div>
                <div className="flex items-center space-x-2">
                    <Button variant="outline" onClick={handleAnalyzeProgress} disabled={isAnalysisLoading}>
                        {isAnalysisLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Activity className="mr-2 h-4 w-4" />}
                         Analyze Progress
                    </Button>
                    <RecommendGoalsDialog allGoals={goals}>
                        <Button variant="outline">
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
                           <ScrollArea className="h-[500px] w-full pr-4">
                                <div className="space-y-6">
                                    {chatHistory.map((msg, index) => (
                                        <div key={index} className={cn("flex items-start gap-3", msg.role === 'user' && "flex-row-reverse")}>
                                            <Avatar>
                                                <AvatarImage src={msg.role === 'user' ? user?.photoURL ?? '' : ''} data-ai-hint="user avatar" />
                                                <AvatarFallback>
                                                    {msg.role === 'user' ? (user?.email?.[0]?.toUpperCase() ?? <User/>) : <Zap/>}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className={cn("p-3 rounded-lg max-w-md", msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                                                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                            </div>
                                        </div>
                                    ))}
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
                            <div className="flex gap-2">
                                <Input
                                    value={userInput}
                                    onChange={(e) => setUserInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                                    placeholder="Ask me anything about your goals, progress, or need advice..."
                                    disabled={isLoading}
                                />
                                <Button onClick={handleSendMessage} disabled={isLoading}>
                                    <Send className="h-4 w-4" />
                                </Button>
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
