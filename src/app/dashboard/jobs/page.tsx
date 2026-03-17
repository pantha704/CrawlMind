"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Search,
  ExternalLink,
  Loader2,
  FileText,
  Clock,
  Globe,
  Sparkles,
  Filter,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CrawlJob {
  id: string;
  query: string;
  status: string;
  inputType: string;
  pagesCrawled: number;
  format: string;
  createdAt: string;
}

const statusColors: Record<string, string> = {
  COMPLETED: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  RUNNING: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  PARTIAL: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  FAILED: "bg-red-500/15 text-red-400 border-red-500/30",
};

export default function CrawlJobsPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<CrawlJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchJobs = useCallback(async () => {
    try {
      const [recentRes, activeRes] = await Promise.all([
        fetch("/api/crawl/recent"),
        fetch("/api/crawl/active"),
      ]);
      const recentData = await recentRes.json();
      const activeData = await activeRes.json();

      const allJobs = [
        ...(activeData.crawls || []),
        ...(recentData.crawls || []),
      ];

      // Deduplicate by ID
      const seen = new Set<string>();
      const unique = allJobs.filter((j: CrawlJob) => {
        if (seen.has(j.id)) return false;
        seen.add(j.id);
        return true;
      });

      setJobs(unique);
    } catch {
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const filtered = jobs.filter((j) => {
    const matchesSearch = j.query
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || j.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Crawl Jobs</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          All your crawl history in one place
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by URL or query..."
            className="pl-10 bg-card border-border/50"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { if (v) setStatusFilter(v); }}>
          <SelectTrigger className="w-[160px] bg-card border-border/50">
            <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="RUNNING">Running</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="PARTIAL">Partial</SelectItem>
            <SelectItem value="FAILED">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Job list */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <FileText className="w-10 h-10 mx-auto mb-4 opacity-40" />
          <p className="text-lg font-medium">No crawl jobs found</p>
          <p className="text-sm mt-1">Start your first crawl from the dashboard</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => router.push("/dashboard")}
          >
            Go to Dashboard
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((job, i) => (
            <motion.div
              key={job.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              onClick={() => router.push(`/dashboard/jobs/${job.id}`)}
              className="group flex items-center gap-4 p-4 rounded-xl bg-card/50 border border-border/40 hover:border-border hover:bg-card cursor-pointer transition-all"
            >
              {/* Icon */}
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                {job.inputType === "PLAINTEXT" ? (
                  <Sparkles className="w-4 h-4 text-amber-400" />
                ) : (
                  <Globe className="w-4 h-4 text-primary" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                  {job.query}
                </p>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    {job.pagesCrawled} pages
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(job.createdAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <Badge variant="outline" className="text-[10px] px-1.5">
                    {job.format}
                  </Badge>
                </div>
              </div>

              {/* Status */}
              <Badge
                variant="outline"
                className={`text-[10px] font-medium shrink-0 ${
                  statusColors[job.status] || ""
                }`}
              >
                {job.status === "RUNNING" && (
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                )}
                {job.status}
              </Badge>

              <ExternalLink className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors shrink-0" />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
