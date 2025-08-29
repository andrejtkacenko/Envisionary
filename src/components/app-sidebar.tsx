
"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { LayoutDashboard, KanbanSquare, Zap, Library, User, Settings, LogOut, HelpCircle, Flag, ListTodo, Send, CalendarCog } from "lucide-react";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/context/AuthContext";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";

export function AppSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const router = useRouter();

  const botName = process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME;

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  }

  const handleLinkTelegram = () => {
    if (botName) {
      window.open(`https://t.me/${botName}?start=link`, '_blank', 'noopener,noreferrer');
    }
  }

  const navItems = [
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
    },
    {
      href: "/",
      label: "Goals Board",
      icon: KanbanSquare,
    },
    {
        href: "/tasks",
        label: "Tasks",
        icon: ListTodo,
    },
    {
        href: "/coach",
        label: "AI Coach",
        icon: Zap,
    },
    {
        href: "/library",
        label: "Library",
        icon: Library,
    }
  ];

  return (
    <aside className="fixed inset-y-0 left-0 z-10 hidden w-14 flex-col border-r bg-background sm:flex">
      <TooltipProvider>
        <nav className="flex flex-col items-center gap-4 px-2 sm:py-5">
          <Link
            href="#"
            className="group flex h-9 w-9 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:h-8 md:w-8 md:text-base"
          >
            <Zap className="h-4 w-4 transition-all group-hover:scale-110" />
            <span className="sr-only">Envisionary</span>
          </Link>
            {navItems.map((item) => (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8",
                      pathname.startsWith(item.href) && item.href !== "/" || pathname === item.href ? "bg-accent text-accent-foreground" : ""
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    <span className="sr-only">{item.label}</span>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">{item.label}</TooltipContent>
              </Tooltip>
            ))}
        </nav>
        <nav className="mt-auto flex flex-col items-center gap-4 px-2 sm:py-5">
           <Popover>
            <Tooltip>
                <TooltipTrigger asChild>
                    <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon" className="rounded-full h-9 w-9">
                            <Avatar className="h-8 w-8">
                                <AvatarImage src={user?.photoURL ?? ""} data-ai-hint="user avatar" />
                                <AvatarFallback>{user?.email?.[0]?.toUpperCase() ?? <User/>}</AvatarFallback>
                            </Avatar>
                        </Button>
                    </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent side="right">Profile</TooltipContent>
            </Tooltip>
            <PopoverContent className="w-64" side="right" align="center">
                <div className="flex flex-col space-y-2">
                     <div className="flex items-center gap-3 p-2">
                        <Avatar className="h-9 w-9">
                           <AvatarImage src={user?.photoURL ?? ""} data-ai-hint="user avatar" />
                           <AvatarFallback>{user?.email?.[0]?.toUpperCase() ?? <User />}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                            <p className="text-sm font-medium truncate">{user?.displayName || (user?.isAnonymous ? "Guest User" : "User")}</p>
                            <p className="text-xs text-muted-foreground truncate">{!user?.isAnonymous && user?.email}</p>
                        </div>
                    </div>
                    <Separator />
                    <div className="p-1 space-y-1">
                        <Button variant="ghost" className="w-full justify-start">
                            <Settings className="mr-2 h-4 w-4" />
                            Settings
                        </Button>
                         <Button variant="ghost" className="w-full justify-start" onClick={handleLinkTelegram} disabled={!botName}>
                            <Send className="mr-2 h-4 w-4" />
                            Link Telegram
                        </Button>
                        <Button variant="ghost" className="w-full justify-start">
                            <HelpCircle className="mr-2 h-4 w-4" />
                            FAQ
                        </Button>
                        <Button variant="ghost" className="w-full justify-start">
                            <Flag className="mr-2 h-4 w-4" />
                            Report a problem
                        </Button>
                    </div>
                    <Separator />
                     <div className="p-1">
                        <Button variant="ghost" className="w-full justify-start" onClick={handleLogout}>
                            <LogOut className="mr-2 h-4 w-4" />
                            Logout
                        </Button>
                     </div>
                </div>
            </PopoverContent>
           </Popover>
        </nav>
      </TooltipProvider>
    </aside>
  );
}
