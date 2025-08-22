
"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function TelegramAuthPage() {
    const { signInWithToken } = useAuth();
    const router = useRouter();
    const [statusMessage, setStatusMessage] = useState<string>("Connecting to Telegram...");
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // A small delay can help ensure the Telegram WebApp object is ready
        const timer = setTimeout(() => {
            const processAuth = async () => {
                if (typeof window !== 'undefined' && window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initData) {
                    const initData = window.Telegram.WebApp.initData;
                    setStatusMessage("Authenticating...");

                    try {
                        const response = await fetch('/api/auth/telegram', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/x-www-form-urlencoded',
                            },
                            body: initData,
                        });

                        if (!response.ok) {
                            const errorData = await response.json();
                            throw new Error(errorData.error || 'Authentication failed');
                        }

                        const { token } = await response.json();
                        await signInWithToken(token);
                        
                        // Redirect to the main dashboard after successful login
                        router.push('/dashboard');

                    } catch (err: any) {
                        console.error(err);
                        setError(err.message || "An unknown error occurred during authentication.");
                    }
                } else {
                     setError("Telegram Web App environment not detected. Please open this via the bot.");
                }
            };

            processAuth();
        }, 50); // 50ms delay

        return () => clearTimeout(timer); // Cleanup timer on unmount
    }, [signInWithToken, router]);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4">
            {error ? (
                <div className="text-center text-destructive">
                    <h1 className="text-2xl font-bold mb-4">Authentication Error</h1>
                    <p>{error}</p>
                </div>
            ) : (
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-12 w-12 animate-spin" />
                    <h1 className="text-xl font-semibold">{statusMessage}</h1>
                    <p className="text-muted-foreground">Please wait while we securely log you in.</p>
                </div>
            )}
        </div>
    );
}

// Add Telegram script to the window interface
declare global {
    interface Window {
        Telegram: any;
    }
}
