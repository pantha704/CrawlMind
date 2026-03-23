"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Users, Download, Eye, FileText, ArrowUpRight } from "lucide-react";
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

// Dynamically import charts with SSR disabled — the canonical fix for Recharts + Next.js
const AdminCharts = dynamic(() => import("./admin-charts"), {
  ssr: false,
  loading: () => (
    <div className="rounded-lg border bg-card p-6 h-[420px] flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  ),
});

interface TopUser {
  id: string;
  name: string;
  email: string;
  image: string | null;
  plan: string;
  crawlCount: number;
  totalPages: number;
  createdAt: string;
}

interface AdminData {
  overview: {
    totalUsers: number;
    subscribedUsers: number;
    freeUsers: number;
    verifiedUsers: number;
    unverifiedUsers: number;
    totalCrawls: number;
    totalPagesFetched: number;
    totalImportedJobs: number;
  };
  planDistribution: { name: string; value: number }[];
  verificationDistribution: { name: string; value: number }[];
  dailyUsage: { date: string; crawls: number; pages: number }[];
  topUsers: TopUser[];
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch("/api/admin/stats");
        if (!res.ok) {
          throw new Error(res.status === 403 ? "Forbidden: Admins only" : "Failed to fetch stats");
        }
        const json = await res.json();
        setData(json);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center">
        <h2 className="text-2xl font-bold text-red-500 mb-4">Access Denied</h2>
        <p className="text-muted-foreground">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  const { overview, dailyUsage, topUsers } = data;

  return (
    <div className="w-full space-y-6 pb-16">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
        <p className="text-muted-foreground">Admin-only overview of total platform usage and metrics.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.totalUsers}</div>
            <div className="text-xs text-muted-foreground mt-1 flex flex-col gap-1">
              <span>{overview.subscribedUsers} Subscribed, {overview.freeUsers} Free</span>
              <span className="text-primary/90">{overview.verifiedUsers} Verified, {overview.unverifiedUsers} Unverified</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Crawl Jobs</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.totalCrawls}</div>
            <p className="text-xs text-muted-foreground">Across all users globally</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pages Fetched</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.totalPagesFetched.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Successfully crawled pages</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Imported Jobs</CardTitle>
            <Download className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.totalImportedJobs}</div>
            <p className="text-xs text-muted-foreground">Jobs imported from downloads</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts — dynamically loaded, no SSR */}
      <AdminCharts dailyUsage={dailyUsage} />

      {/* Top Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Top Users (By Crawls)</CardTitle>
          <CardDescription>Click a user row for detailed analytics.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto max-h-[400px]">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase bg-muted text-muted-foreground sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Plan</th>
                  <th className="px-4 py-3 font-medium text-right">Crawls</th>
                  <th className="px-4 py-3 font-medium text-right">Pages</th>
                  <th className="px-4 py-3 font-medium text-right">Joined</th>
                </tr>
              </thead>
              <tbody>
                {topUsers.map((user) => (
                  <tr key={user.id} className="border-b border-border hover:bg-muted/50 transition-colors group">
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/admin/users/${user.id}`} className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.image || undefined} alt={user.name} />
                          <AvatarFallback>{user.name?.[0]?.toUpperCase() || "U"}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium flex items-center gap-2 group-hover:text-primary transition-colors">
                            {user.name} <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                          <div className="text-xs text-muted-foreground">{user.email}</div>
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={user.plan === "SPARK" ? "outline" : "default"}>
                        {user.plan}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">{user.crawlCount}</td>
                    <td className="px-4 py-3 text-right">{user.totalPages?.toLocaleString() || 0}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
