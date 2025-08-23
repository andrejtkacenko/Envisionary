
"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { linkTelegramToUser } from '@/lib/goals-service';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// Add Telegram script to the window interface
declare global {
    interface Window {
        Telegram: any;
    }
}

export default function LinkTelegramPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('Linking your account...');

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            router.push('/login');
            return;
        }

        const linkAccount = async () => {
            if (typeof window !== 'undefined' && window.Telegram && window.Telegram.WebApp) {
                // Give telegram script a moment to initialize
                setTimeout(async () => {
                    const initData = new URLSearchParams(window.Telegram.WebApp.initData);
                    const telegramUserRaw = initData.get('user');
                    
                    if (!telegramUserRaw) {
                        setStatus('error');
                        setMessage('Could not retrieve Telegram user data. Please ensure you open this from the bot.');
                        return;
                    }

                    try {
                        const telegramUser = JSON.parse(telegramUserRaw);
                        await linkTelegramToUser(user.uid, telegramUser.id);
                        
                        setStatus('success');
                        setMessage('Your Telegram account has been successfully linked!');
                        toast({ title: "Account Linked!", description: message });
                        
                        // Close the web app
                        setTimeout(() => window.Telegram.WebApp.close(), 2000);

                    } catch (err) {
                        console.error(err);
                        setStatus('error');
                        setMessage('An error occurred while linking your account.');
                         toast({ variant: 'destructive', title: "Linking Failed", description: message });
                    }
                }, 100);

            } else {
                setStatus('error');
                setMessage("This page must be opened from the Telegram app to link your account.");
            }
        };

        linkAccount();
    }, [user, authLoading, router, toast]);

    return (
        <div className="flex items-center justify-center min-h-screen bg-muted/40">
            <Card className="w-full max-w-md text-center">
                <CardHeader>
                    <CardTitle>Link Telegram Account</CardTitle>
                    <CardDescription>Please wait while we connect your Telegram account to your Zenith Flow profile.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center p-8 gap-4">
                    {status === 'loading' && <Loader2 className="h-16 w-16 animate-spin text-primary" />}
                    {status === 'success' && <CheckCircle className="h-16 w-16 text-green-500" />}
                    {status === 'error' && <XCircle className="h-16 w-16 text-destructive" />}
                    <p className="text-lg font-medium">{message}</p>
                     {status === 'success' && (
                        <p className="text-sm text-muted-foreground">This window will close automatically.</p>
                     )}
                </CardContent>
            </Card>
        </div>
    );
}