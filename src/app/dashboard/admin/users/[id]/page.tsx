"use client";

import { useEffect, useState, use } from "react";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, ArrowLeft, Eye, FileText, Download } from "lucide-react";
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow, format } from "date-fns";
import { buttonVariants } from "@/components/ui/button";

export default function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const userId = unwrappedParams.id;
  
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    fetchUserStats();
  }, [userId]);

  const fetchUserStats = async () => {
    try {
      const res = await fetch(`/api/admin/users/${userId}`);
      if (!res.ok) {
        throw new Error(res.status === 403 ? "Forbidden: Admins only" : "Failed to fetch user stats");
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
      <div className="flex h-screen bg-background items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 p-8 flex flex-col items-center justify-center">
          <h2 className="text-2xl font-bold text-red-500 mb-4">Error</h2>
          <p className="text-muted-foreground">{error}</p>
          <Link href="/dashboard/admin" className={buttonVariants({ className: "mt-4" })}>
            Back to Admin
          </Link>
        </div>
      </div>
    );
  }

  const { user, stats, crawlJobs } = data;

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="flex-1 overflow-y-auto">
        <div className="p-8 max-w-7xl mx-auto space-y-8 pb-32">
          
          <div className="flex items-center gap-4">
            <Link href="/dashboard/admin" className={buttonVariants({ variant: "outline", size: "icon" })}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">User Details</h1>
              <p className="text-muted-foreground">In-depth analytics for this specific user.</p>
            </div>
          </div>

          <Card>
            <CardContent className="pt-6 flex flex-col md:flex-row items-center gap-6">
              <Avatar className="h-24 w-24">
                <AvatarImage src={user.image} alt={user.name} />
                <AvatarFallback className="text-2xl">{user.name?.[0]?.toUpperCase() || "U"}</AvatarFallback>
              </Avatar>
              <div className="space-y-2 text-center md:text-left flex-1">
                <h2 className="text-2xl font-bold">{user.name}</h2>
                <p className="text-muted-foreground">{user.email}</p>
                <div className="flex items-center justify-center md:justify-start gap-4 pt-2">
                  <Badge variant={user.plan === "SPARK" ? "outline" : "default"}>{user.plan} PLAN</Badge>
                  <span className="text-sm text-muted-foreground">
                    Joined {format(new Date(user.createdAt), "MMMM d, yyyy")}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Crawls</CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalCrawls}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pages Fetched</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalPages.toLocaleString()}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Imported Jobs</CardTitle>
                <Download className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.importedCrawls}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Crawl History</CardTitle>
              <CardDescription>All crawl jobs initiated by this user.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-auto max-h-[500px]">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs uppercase bg-muted text-muted-foreground sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3 font-medium">Query / Domain</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium text-right">Pages</th>
                      <th className="px-4 py-3 font-medium text-center">Type</th>
                      <th className="px-4 py-3 font-medium text-right">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {crawlJobs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-6 text-muted-foreground">No crawls found for this user.</td>
                      </tr>
                    ) : (
                      crawlJobs.map((job: any) => (
                        <tr key={job.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-medium truncate max-w-[300px]" title={job.query}>{job.query}</div>
                            {job.urlDomain && <div className="text-xs text-muted-foreground">{job.urlDomain}</div>}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={job.status === "COMPLETED" ? "default" : job.status === "FAILED" ? "destructive" : "secondary"}>
                              {job.status}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-right">
                            {job.pagesCrawled || 0} <span className="text-xs text-muted-foreground">/ {job.maxPages || "∞"}</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {job.isImported ? (
                              <Badge variant="outline" className="text-xs border-blue-500/30 text-blue-400">Imported</Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">Native</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right text-muted-foreground whitespace-nowrap">
                            {formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

        </div>
      </main>
    </div>
  );
}
