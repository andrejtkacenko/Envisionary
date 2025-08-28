
"use client";

import { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RecommendationChatProps {
    messages: string[];
}

export const RecommendationChat = ({ messages }: RecommendationChatProps) => {
    const scrollAreaRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollAreaRef.current) {
            scrollAreaRef.current.scrollTo({
                top: scrollAreaRef.current.scrollHeight,
                behavior: 'smooth',
            });
        }
    }, [messages]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>AI Analysis</CardTitle>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-48 w-full" ref={scrollAreaRef}>
                    <div className="space-y-4 pr-4">
                        {messages.length === 0 && (
                             <div className="flex items-center justify-center h-full text-muted-foreground">
                                <p>My feedback will appear here as you answer.</p>
                            </div>
                        )}
                        {messages.map((msg, index) => (
                            <div key={index} className="flex items-start gap-3">
                                <Avatar>
                                    <AvatarFallback><Zap /></AvatarFallback>
                                </Avatar>
                                <div className="p-3 rounded-lg bg-muted">
                                    <p className="text-sm">{msg}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
};
