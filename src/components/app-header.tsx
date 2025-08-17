"use client";

import Link from "next/link";
import {
  Bell,
  Home,
  LineChart,
  Package,
  Package2,
  Plus,
  Settings,
  Users,
  Zap,
  PanelLeft
} from "lucide-react";
import type { Goal } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Logo } from "@/components/logo";
import { ProgressReportDialog } from "@/components/progress-report-dialog";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

interface AppHeaderProps {
  allGoals: Goal[];
}

export function AppHeader({ allGoals }: AppHeaderProps) {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
       <Sheet>
            <SheetTrigger asChild>
              <Button size="icon" variant="outline" className="sm:hidden">
                <PanelLeft className="h-5 w-5" />
                <span className="sr-only">Toggle Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="sm:max-w-xs">
              <nav className="grid gap-6 text-lg font-medium">
                <Link
                  href="#"
                  className="group flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:text-base"
                >
                  <Zap className="h-5 w-5 transition-all group-hover:scale-110" />
                  <span className="sr-only">Zenith Flow</span>
                </Link>
                <Link
                  href="/dashboard"
                  className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground"
                >
                  <Home className="h-5 w-5" />
                  Dashboard
                </Link>
                <Link
                  href="/"
                  className="flex items-center gap-4 px-2.5 text-foreground"
                >
                  <Users className="h-5 w-5" />
                  Kanban Board
                </Link>
              </nav>
            </SheetContent>
          </Sheet>
      <div className="flex w-full items-center gap-4 md:ml-auto md:gap-2 lg:gap-4">
        <div className="ml-auto flex-1 sm:flex-initial">
          <div className="flex items-center gap-2">
            <ProgressReportDialog allGoals={allGoals} />
            <Button asChild>
              <Link href="/create-goal">
                <Plus className="mr-2 h-4 w-4" /> New Goal
              </Link>
            </Button>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary" size="icon" className="rounded-full">
              <Avatar>
                <AvatarImage src={user?.photoURL ?? "https://placehold.co/100x100.png"} alt="User" data-ai-hint="user avatar" />
                <AvatarFallback>{user?.email?.[0]?.toUpperCase() ?? 'U'}</AvatarFallback>
              </Avatar>
              <span className="sr-only">Toggle user menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{user?.isAnonymous ? "Guest" : (user?.email ?? "My Account")}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Settings</DropdownMenuItem>
            <DropdownMenuItem>Support</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>Logout</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
