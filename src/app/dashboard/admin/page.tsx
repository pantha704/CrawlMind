"use client";

import { useEffect, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Users, Download, Eye, FileText, ArrowUpRight } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export default function AdminDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);


  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/admin/stats");
      if (!res.ok) {
        throw new Error(res.status === 403 ? "Forbidden: Admins only" : "Failed to fetch stats");
      }
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

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

  const { overview, planDistribution, dailyUsage, topUsers } = data;

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-32">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
            <p className="text-muted-foreground">Admin-only overview of total platform usage and metrics.</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview.totalUsers}</div>
                <p className="text-xs text-muted-foreground">
                  {overview.subscribedUsers} Subscribed, {overview.freeUsers} Free
                </p>
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

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Usage Over Last 30 Days</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailyUsage} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      stroke="#888888"
                      fontSize={12}
                    />
                    <YAxis 
                      yAxisId="left" 
                      stroke="#888888" 
                      fontSize={12} 
                      tickFormatter={(value) => `${value}`}
                    />
                    <YAxis 
                      yAxisId="right" 
                      orientation="right" 
                      stroke="#888888" 
                      fontSize={12} 
                      tickFormatter={(value) => `${value}`}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#111', border: '1px solid #333' }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="crawls" stroke="#00C49F" name="New Crawls" strokeWidth={2} dot={false} />
                    <Line yAxisId="right" type="monotone" dataKey="pages" stroke="#0088FE" name="Pages Fetched" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Plan Distribution</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px] flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={planDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {planDistribution.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#111', border: '1px solid #333' }} />
                    <Legend verticalAlign="bottom" height={36}/>
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

          </div>

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
                    {topUsers.map((user: any) => (
                      <tr key={user.id} className="border-b border-border hover:bg-muted/50 transition-colors group">
                        <td className="px-4 py-3">
                          <Link href={`/dashboard/admin/users/${user.id}`} className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={user.image} alt={user.name} />
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
