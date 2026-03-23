"use client";

import { Search, Bell, Menu } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useSession, signOut } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

interface TopbarProps {
  onMenuClick?: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const [usage, setUsage] = useState({ crawlsToday: 0, maxCrawls: 2 });
  const { data: session } = useSession();
  const router = useRouter();

  const userInitial = session?.user?.name
    ? session.user.name.charAt(0).toUpperCase()
    : session?.user?.email
    ? session.user.email.charAt(0).toUpperCase()
    : "?";

  const userPlan = (session?.user as { plan?: string })?.plan || "FREE";

  useEffect(() => {
    fetch("/api/user/usage")
      .then((r) => r.json())
      .then((data) => {
        if (!data.error) setUsage(data);
      });
  }, []);

  const handleLogout = async () => {
    await signOut();
    router.push("/signin");
  };

  return (
    <header className="h-16 border-b border-border/50 bg-background/80 backdrop-blur-xl sticky top-0 z-40 px-4 sm:px-6 flex items-center justify-between gap-4">
      {/* Mobile menu button */}
      <button onClick={onMenuClick} className="lg:hidden p-2 -ml-2">
        <Menu className="w-5 h-5" />
      </button>

      {/* Search */}
      <div className="hidden sm:flex flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search your past crawls..."
            className="pl-10 bg-secondary/50 border-border/50"
          />
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {/* Usage indicator */}
        <span className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary text-xs text-muted-foreground">
          {usage.crawlsToday}/{usage.maxCrawls} crawls today
        </span>

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-4 h-4" />
        </Button>

        {/* User avatar */}
        <DropdownMenu>
          <DropdownMenuTrigger className="relative h-8 w-8 rounded-full outline-none">
            <Avatar className="h-8 w-8 cursor-pointer">
              <AvatarImage src={session?.user?.image || ""} alt={session?.user?.name || "User"} />
              <AvatarFallback className="bg-primary/20 text-primary text-xs">
                {userInitial}
              </AvatarFallback>
            </Avatar>
            {/* Plan Badge */}
            {userPlan !== "FREE" && (
              <div className="absolute -bottom-1 -right-1 flex h-[14px] items-center justify-center rounded-sm bg-primary px-1 text-[8px] font-bold text-primary-foreground shadow-sm ring-1 ring-background">
                {userPlan === "PRO" ? "PRO" : userPlan === "PRO_PLUS" ? "PRO+" : "SCALE"}
              </div>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem>
              <Link href="/dashboard/settings" className="flex w-full">Settings</Link>
            </DropdownMenuItem>
            
            {userPlan !== "SCALE" && (
              <DropdownMenuItem>
                <Link href="/pricing" className="flex w-full">Upgrade Plan</Link>
              </DropdownMenuItem>
            )}
            
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive cursor-pointer" onClick={handleLogout}>
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

