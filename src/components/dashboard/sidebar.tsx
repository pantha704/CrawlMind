"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Bug,
  MessageSquare,
  FolderOpen,
  BarChart3,
  Settings,
  Plus,
  LogOut,
  Sprout,
  ShieldCheck,
  MessageCircleQuestion,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: Bug, label: "Crawl Jobs", href: "/dashboard/jobs" },
  { icon: MessageSquare, label: "AI Chat", href: "/dashboard/chat" },
  { icon: FolderOpen, label: "Saved Results", href: "/dashboard/library" },
  { icon: BarChart3, label: "Analytics", href: "/dashboard/analytics" },
  { icon: Settings, label: "Settings", href: "/dashboard/settings" },
  { icon: LayoutDashboard /* using placeholder since user icon isn't imported */, label: "Profile", href: "/dashboard/profile" },
];

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const [usage, setUsage] = useState({
    plan: "SPARK",
    planName: "Spark",
    crawlsToday: 0,
    maxCrawls: 2,
    usagePercent: 0,
    isAdmin: false,
  });

  useEffect(() => {
    fetch("/api/user/usage")
      .then((r) => r.json())
      .then((data) => {
        if (!data.error) setUsage(data);
      });
  }, []);

  return (
    <>
      {/* Logo */}
      <div className="h-16 px-6 flex items-center border-b border-sidebar-border">
        <Link href="/" className="flex items-center gap-2" onClick={onNavigate}>
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Sprout className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-bold text-lg text-sidebar-foreground">
            CrawlMind
          </span>
        </Link>
      </div>

      {/* New Crawl Button */}
      <div className="px-4 pt-4">
        <Link href="/dashboard" onClick={onNavigate}>
          <Button className="w-full glow-cyan" size="lg">
            <Plus className="w-4 h-4 mr-2" />
            New Crawl
          </Button>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}

        <Separator className="my-3 bg-sidebar-border" />

        {usage.isAdmin && (
          <Link
            href="/dashboard/admin"
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200",
              pathname.startsWith("/dashboard/admin")
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
            )}
          >
            <ShieldCheck className="w-4 h-4" />
            Admin Panel
          </Link>
        )}

        <button
          onClick={() => window.dispatchEvent(new Event('open-feedback-modal'))}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors"
        >
          <MessageCircleQuestion className="w-4 h-4" />
          Send Feedback
        </button>
      </nav>

      {/* Bottom: Plan & Usage */}
      <div className="p-4 border-t border-sidebar-border space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary font-medium">
            {usage.planName}
          </span>
          <span className="text-sidebar-foreground/50">
            {usage.crawlsToday}/{usage.maxCrawls} today
          </span>
        </div>
        <Progress value={usage.usagePercent} className="h-1.5" />

        <button className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/50 transition-colors">
          <LogOut className="w-4 h-4" />
          Log out
        </button>
      </div>
    </>
  );
}

export function Sidebar({ open, onClose }: SidebarProps) {
  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 h-screen bg-sidebar border-r border-sidebar-border sticky top-0">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar (Sheet) */}
      <Sheet open={open} onOpenChange={onClose}>
        <SheetContent
          side="left"
          className="w-64 p-0 bg-sidebar border-sidebar-border flex flex-col"
        >
          <SidebarContent onNavigate={onClose} />
        </SheetContent>
      </Sheet>
    </>
  );
}
