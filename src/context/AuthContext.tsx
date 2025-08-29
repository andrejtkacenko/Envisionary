
"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { auth } from "@/lib/firebase";
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  signInWithCustomToken
} from "firebase/auth";
import { getAppUser } from "@/lib/user-actions";
import type { AppUser } from "@/types";
import { useToast } from "@/hooks/use-toast";


interface AuthContextType {
  user: User | null;
  appUser: AppUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signInWithToken: (token: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
          try {
              const dbUser = await getAppUser(currentUser);
              setAppUser(dbUser);
          } catch(e) {
              console.error("Failed to get/create user in DB", e);
              toast({ variant: 'destructive', title: "Database Error", description: "Could not sync user account."});
              setAppUser(null);
          }
      } else {
        setAppUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [toast]);

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUp = async (email: string, password: string) => {
    await createUserWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    await signOut(auth);
  };
  
  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };
  
  const signInWithToken = async (token: string) => {
    await signInWithCustomToken(auth, token);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        appUser,
        loading,
        signIn,
        signUp,
        logout,
        resetPassword,
        signInWithToken,
      }}
    >
      {children}
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
