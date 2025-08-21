
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Logo } from "@/components/logo";
import { Separator } from "@/components/ui/separator";
import { verifyTelegramCode } from "@/lib/telegram-service";

const signupSchema = z
  .object({
    email: z.string().email({ message: "Invalid email address" }),
    password: z
      .string()
      .min(8, { message: "Password must be at least 8 characters long" }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type SignupFormValues = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const { signUp, signInWithGoogle, signInAsGuest, signInWithTelegram } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showTelegramLogin, setShowTelegramLogin] = useState(false);
  const [telegramCode, setTelegramCode] = useState('');

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { email: "", password: "", confirmPassword: "" },
  });

  const handleSignup = async (data: SignupFormValues) => {
    setIsLoading(true);
    try {
      await signUp(data.email, data.password);
      router.push("/");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Signup Failed",
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      await signInWithGoogle();
      router.push("/");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Google Sign-In Failed",
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  }

  const handleGuestSignIn = async () => {
    setIsLoading(true);
    try {
      await signInAsGuest();
      router.push("/");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Guest Sign-In Failed",
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  }
  
  const handleTelegramCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!telegramCode) return;
    setIsLoading(true);
    try {
        const result = await verifyTelegramCode(telegramCode);
        if (result && result.userId) {
            // This is a simplified example. In a real app, you would have a backend
            // that takes this userId, verifies it, and returns a custom Firebase token.
            // For now, we'll just log the user in as a guest to show the flow works.
            await signInAsGuest();
            toast({
                title: "Telegram Login Successful",
                description: `Authenticated as Telegram user ${result.userId}.`,
            });
            router.push('/');
        } else {
             toast({
                variant: "destructive",
                title: "Invalid Code",
                description: "The code is incorrect or has expired.",
            });
        }
    } catch (error: any) {
         toast({
            variant: "destructive",
            title: "Telegram Sign-In Failed",
            description: error.message,
        });
    } finally {
        setIsLoading(false);
    }
  };

  const handleTelegramClick = async () => {
    setShowTelegramLogin(true);
    await signInWithTelegram();
  }


  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Logo />
          </div>
          <CardTitle className="font-headline">Create an Account</CardTitle>
          <CardDescription>
            Join Zenith Flow to start managing your projects.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {showTelegramLogin ? (
            <form onSubmit={handleTelegramCodeSubmit} className="space-y-4">
              <FormLabel>Telegram Code</FormLabel>
              <Input 
                type="text" 
                placeholder="123456" 
                value={telegramCode}
                onChange={(e) => setTelegramCode(e.target.value)}
                autoFocus
              />
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Verifying...' : 'Sign In with Code'}
              </Button>
              <Button variant="link" className="w-full" onClick={() => setShowTelegramLogin(false)}>
                Cancel
              </Button>
            </form>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSignup)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="you@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Creating Account...' : 'Create Account'}
                </Button>
              </form>
            </Form>
          )}
          <div className="relative my-6">
            <Separator />
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-center bg-card px-2">
              <span className="text-sm text-muted-foreground">OR</span>
            </div>
          </div>
           <div className="space-y-2">
              <Button variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={isLoading}>
                Sign up with Google
              </Button>
              <Button variant="outline" className="w-full" onClick={handleTelegramClick} disabled={isLoading}>
                Sign in with Telegram
              </Button>
              <Button variant="secondary" className="w-full" onClick={handleGuestSignIn} disabled={isLoading}>
                Continue as Guest
              </Button>
           </div>
        </CardContent>
        <CardFooter className="justify-center text-sm">
          <p>
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-primary hover:underline">
              Log in
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
