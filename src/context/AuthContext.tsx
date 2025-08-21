
"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { auth } from "@/lib/firebase";
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  signInAnonymously,
  sendPasswordResetEmail,
  signInWithCustomToken
} from "firebase/auth";
import { verifyTelegramCode } from "@/lib/telegram-service";
import { useToast } from "@/hooks/use-toast";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInAsGuest: () => Promise<void>;
  triggerTelegramAuth: () => void;
  signInWithTelegramCode: (code: string) => Promise<boolean>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUp = async (email: string, password: string) => {
    await createUserWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    await signOut(auth);
  };

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const signInAsGuest = async () => {
    await signInAnonymously(auth);
  };
  
  const triggerTelegramAuth = () => {
    toast({
      title: "Check your Telegram!",
      description: "Send the /start command to your bot to receive a login code.",
    });
  }

  const signInWithTelegramCode = async (code: string): Promise<boolean> => {
    try {
      const result = await verifyTelegramCode(code);
      if (result) {
        // This is a simplified flow. In a real app, you would have a backend
        // that creates a custom Firebase token for the Telegram user.
        // For now, we'll sign them in as a guest to demonstrate the code verification.
        await signInAnonymously(auth);
        toast({
            title: "Telegram Login Successful (Demo)",
            description: `Code verified for user ${result.userId}. You are logged in as a guest.`,
        });
        return true;
      } else {
        toast({ variant: 'destructive', title: 'Invalid or expired code.'});
        return false;
      }
    } catch (e) {
      console.error(e);
      toast({ variant: 'destructive', title: 'Telegram Sign-In Failed'});
      return false;
    }
  }

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signIn,
        signUp,
        logout,
        signInWithGoogle,
        signInAsGuest,
        triggerTelegramAuth,
        signInWithTelegramCode,
        resetPassword,
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
