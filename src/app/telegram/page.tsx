
"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function TelegramAuthPage() {
    const { signInWithToken } = useAuth();
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const processAuth = async () => {
            if (typeof window !== 'undefined' && window.Telegram && window.Telegram.WebApp) {
                const initData = window.Telegram.WebApp.initData;

                if (!initData) {
                    setError("Telegram initData not found. Please open this page through the Telegram app.");
                    return;
                }

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
                    <h1 className="text-xl font-semibold">Authenticating...</h1>
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
