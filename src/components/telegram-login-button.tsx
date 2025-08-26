
"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Button } from './ui/button';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Add onTelegramAuth to the window interface for TypeScript
declare global {
    interface Window {
        onTelegramAuth: (user: any) => void;
    }
}

interface TelegramLoginButtonProps {
    onAuth: (data: any) => void;
    isLoading?: boolean;
}

export const TelegramLoginButton = ({ onAuth, isLoading }: TelegramLoginButtonProps) => {
    const ref = useRef<HTMLDivElement>(null);
    const { toast } = useToast();
    const [isBotNameMissing, setIsBotNameMissing] = useState(false);
    
    const botName = process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME;

    useEffect(() => {
        if (!botName) {
            setIsBotNameMissing(true);
            toast({
                variant: "destructive",
                title: "Configuration Error",
                description: "Telegram Bot Name is not configured.",
            });
            return;
        }

        if (ref.current === null) {
            return;
        }
        
        // Assign the callback function to the window object
        window.onTelegramAuth = (user: any) => {
            onAuth(user);
        };

        const script = document.createElement('script');
        script.src = 'https://telegram.org/js/telegram-widget.js?22';
        script.async = true;
        script.setAttribute('data-telegram-login', botName);
        script.setAttribute('data-size', 'large');
        script.setAttribute('data-radius', '6');
        script.setAttribute('data-request-access', 'write');
        script.setAttribute('data-onauth', 'onTelegramAuth(user)');
        
        // Clear any previous scripts before appending
        ref.current.innerHTML = '';
        ref.current.appendChild(script);

        return () => {
            // Clean up the global function when the component unmounts
            if (window.onTelegramAuth) {
                delete (window as any).onTelegramAuth;
            }
        };
    }, [botName, onAuth, toast]);

    if (isBotNameMissing) {
        return <Button disabled>Telegram Login Unavailable</Button>;
    }
    
    // The script will replace the div with the button.
    // We show our styled button if the script is loading or has failed.
    return (
        <div className="w-full">
            {isLoading && (
                 <Button variant="outline" className="w-full" disabled>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connecting to Telegram...
                 </Button>
            )}
             <div ref={ref} className={isLoading ? 'hidden' : ''} />
        </div>
    );
};
