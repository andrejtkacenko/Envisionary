
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, KanbanSquare, Zap, Calendar as CalendarIcon } from "lucide-react";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function AppSidebar() {
  const pathname = usePathname();

  const navItems = [
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
    },
    {
      href: "/",
      label: "Kanban Board",
      icon: KanbanSquare,
    },
    {
        href: "/coach",
        label: "AI Coach",
        icon: Zap,
    },
    {
        href: "/planner",
        label: "Planner",
        icon: CalendarIcon,
    },
    {
        href: "/calendar",
        label: "Calendar",
        icon: CalendarIcon,
    }
  ];

  return (
    <aside className="fixed inset-y-0 left-0 z-10 hidden w-16 flex-col border-r bg-background sm:flex">
      <div className="flex flex-col items-center gap-4 px-2 py-4">
        <div className="h-10 w-10">
          <Logo />
        </div>
      </div>
      <nav className="flex flex-col items-center gap-4 px-2 sm:py-5 flex-1">
        <TooltipProvider>
          {navItems.map((item) => (
            <Tooltip key={item.href}>
              <TooltipTrigger asChild>
                <Link
                  href={item.href}
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8",
                    (pathname === item.href || (item.href === "/planner" && pathname === "/calendar")) && "bg-accent text-accent-foreground"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="sr-only">{item.label}</span>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">{item.label}</TooltipContent>
            </Tooltip>
          ))}
        </TooltipProvider>
      </nav>
    </aside>
  );
}
