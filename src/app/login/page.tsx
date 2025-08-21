
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
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Logo } from "@/components/logo";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";

const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(1, { message: "Password is required" }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { signIn, signInWithGoogle, signInAsGuest, signInWithTelegram } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showTelegramLogin, setShowTelegramLogin] = useState(false);
  const [telegramCode, setTelegramCode] = useState('');

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const handleLogin = async (data: LoginFormValues) => {
    setIsLoading(true);
    try {
      await signIn(data.email, data.password);
      router.push("/");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Login Failed",
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
        // This flow is simplified for demonstration.
        // In a real app, you'd get a custom token from your backend
        // after it verifies the code and Telegram user ID.
        await signInAsGuest(); 
        toast({
            title: "Telegram Login Successful (Demo)",
            description: `Successfully authenticated via Telegram.`,
        });
        router.push('/');
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
          <CardTitle className="font-headline">Welcome Back</CardTitle>
          <CardDescription>
            Enter your credentials to access your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {showTelegramLogin ? (
            <form onSubmit={handleTelegramCodeSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="telegram-code">Telegram Code</Label>
                <Input 
                  id="telegram-code"
                  type="text" 
                  placeholder="123456" 
                  value={telegramCode}
                  onChange={(e) => setTelegramCode(e.target.value)}
                  autoFocus
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading || !telegramCode}>
                {isLoading ? 'Verifying...' : 'Sign In with Code'}
              </Button>
              <Button variant="link" className="w-full" onClick={() => setShowTelegramLogin(false)}>
                Cancel
              </Button>
            </form>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleLogin)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <Label>Email</Label>
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
                      <Label>Password</Label>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Signing In...' : 'Sign In'}
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
                Sign in with Google
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
            Don't have an account?{" "}
            <Link href="/signup" className="font-semibold text-primary hover:underline">
              Sign up
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
