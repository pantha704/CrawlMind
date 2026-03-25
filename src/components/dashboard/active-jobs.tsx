"use client";

import { useEffect, useState, useRef } from "react";
import { Loader2, CheckCircle2, XCircle, Clock, Trash2, Ban, Brain } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import Link from "next/link";

interface Job {
  id: string;
  query: string;
  status: string;
  pagesCrawled: number;
  config: { limit?: number };
  startedAt: string;
}

interface ResearchJob {
  id: string;
  query: string;
  status: string;
  depthLevel: string;
  totalPages: number;
  subJobs: { id: string; status: string; query: string; pagesCrawled: number }[];
}

const statusConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  QUEUED: { icon: Clock, color: "text-yellow-500", label: "Queued" },
  RUNNING: { icon: Loader2, color: "text-primary", label: "Crawling Site" },
  FETCHING_RESULTS: { icon: Loader2, color: "text-blue-500", label: "Downloading Data" },
  COMPLETED: { icon: CheckCircle2, color: "text-green-500", label: "Done" },
  PARTIAL: { icon: CheckCircle2, color: "text-orange-500", label: "Partial" },
  FAILED: { icon: XCircle, color: "text-destructive", label: "Failed" },
};

const researchStatusConfig: Record<string, { label: string; color: string }> = {
  DISCOVERING: { label: "Discovering", color: "text-purple-400" },
  CRAWLING: { label: "Crawling", color: "text-primary" },
  SYNTHESIZING: { label: "Synthesizing", color: "text-amber-400" },
  COMPLETED: { label: "Complete", color: "text-green-500" },
  FAILED: { label: "Failed", color: "text-destructive" },
};

const depthLabels: Record<string, string> = {
  QUICK: "⚡ Quick",
  STANDARD: "🔍 Deep Dive",
  RESEARCH: "🧠 Research",
};

export function ActiveJobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [researchJobs, setResearchJobs] = useState<ResearchJob[]>([]);
  const [loading, setLoading] = useState(true);
  const jobsRef = useRef(jobs);
  const researchRef = useRef(researchJobs);
  jobsRef.current = jobs;
  researchRef.current = researchJobs;

  useEffect(() => {
    let active = true;
    let timeoutId: NodeJS.Timeout;

    async function fetchJobs() {
      if (!active) return;
      try {
        const [crawlRes, researchRes] = await Promise.all([
          fetch("/api/crawl/active"),
          fetch("/api/research/active").catch(() => null),
        ]);

        if (crawlRes.ok) {
          const data = await crawlRes.json();
          setJobs(data.jobs || []);
        }

        if (researchRes?.ok) {
          const data = await researchRes.json();
          setResearchJobs(data.jobs || []);
        }

        const hasActiveCrawls = jobsRef.current.some(
          (j) => j.status === "RUNNING" || j.status === "QUEUED" || j.status === "FETCHING_RESULTS"
        );
        const hasActiveResearch = researchRef.current.some(
          (j) => j.status === "DISCOVERING" || j.status === "CRAWLING" || j.status === "SYNTHESIZING"
        );

        timeoutId = setTimeout(fetchJobs, (hasActiveCrawls || hasActiveResearch) ? 3000 : 10000);
      } catch {
        timeoutId = setTimeout(fetchJobs, 10000);
      } finally {
        setLoading(false);
      }
    }

    fetchJobs();
    return () => {
      active = false;
      clearTimeout(timeoutId);
    };
  }, []);

  const handleCancel = async (jobId: string) => {
    try {
      const res = await fetch(`/api/crawl/${jobId}/cancel`, { method: "POST" });
      if (res.ok) {
        setJobs((prev) => prev.filter((j) => j.id !== jobId));
        toast.success("Job cancelled");
      } else {
        toast.error("Failed to cancel job");
      }
    } catch {
      toast.error("Failed to cancel job");
    }
  };

  const handleDelete = async (jobId: string) => {
    try {
      const res = await fetch(`/api/crawl/${jobId}`, { method: "DELETE" });
      if (res.ok) {
        setJobs((prev) => prev.filter((j) => j.id !== jobId));
        toast.success("Job archived");
      } else {
        toast.error("Failed to archive job");
      }
    } catch {
      toast.error("Failed to archive job");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading active jobs...
      </div>
    );
  }

  if (jobs.length === 0 && researchJobs.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        <p>No active jobs. Start a crawl or research above!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
        Active Jobs
      </h3>

      {/* Research Jobs */}
      {researchJobs.map((rj) => {
        const rCfg = researchStatusConfig[rj.status] || researchStatusConfig.CRAWLING;
        const completedSubs = rj.subJobs?.filter(j => j.status === "COMPLETED").length || 0;
        const totalSubs = rj.subJobs?.length || 0;
        const isActive = ["DISCOVERING", "CRAWLING", "SYNTHESIZING"].includes(rj.status);

        return (
          <Link
            key={rj.id}
            href={`/dashboard/research/${rj.id}`}
            className="block group p-4 rounded-xl bg-card border border-purple-500/20 hover:border-purple-500/40 space-y-3 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <Brain className={`w-4 h-4 shrink-0 text-purple-400 ${isActive ? "animate-pulse" : ""}`} />
                <span className="text-sm font-medium truncate">{rj.query}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Badge variant="outline" className="text-[10px] border-purple-500/30 text-purple-400">
                  {depthLabels[rj.depthLevel] || rj.depthLevel}
                </Badge>
                <Badge variant="outline" className={`shrink-0 text-xs ${rCfg.color}`}>
                  {rCfg.label}
                </Badge>
              </div>
            </div>

            {isActive && (
              <div className="text-xs text-muted-foreground flex items-center gap-2">
                <div className="h-1 flex-1 rounded-full bg-purple-500/10 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-purple-500/40 transition-all duration-500"
                    style={{ width: totalSubs > 0 ? `${(completedSubs / totalSubs) * 100}%` : "33%" }}
                  />
                </div>
                <span>
                  {rj.status === "SYNTHESIZING"
                    ? "AI synthesizing results..."
                    : `Crawling ${completedSubs}/${totalSubs} sites · ${rj.totalPages || 0} pages`
                  }
                </span>
              </div>
            )}
          </Link>
        );
      })}

      {/* Regular Crawl Jobs */}
      {jobs.map((job) => {
        const cfg = statusConfig[job.status] || statusConfig.QUEUED;
        const Icon = cfg.icon;

        return (
          <div
            key={job.id}
            className="group p-4 rounded-xl bg-card border border-border/50 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <Icon
                  className={`w-4 h-4 shrink-0 ${cfg.color} ${
                    (job.status === "RUNNING" || job.status === "FETCHING_RESULTS") ? "animate-spin" : ""
                  }`}
                />
                <span className="text-sm font-medium truncate">
                  {job.query}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {(job.status === "RUNNING" || job.status === "QUEUED") && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-yellow-500"
                    onClick={() => handleCancel(job.id)}
                    title="Cancel job"
                  >
                    <Ban className="w-3.5 h-3.5" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-400"
                  onClick={() => handleDelete(job.id)}
                  title="Delete job"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
                <Badge variant="outline" className="shrink-0 text-xs">
                  {cfg.label}
                </Badge>
              </div>
            </div>

            {(job.status === "RUNNING" || job.status === "QUEUED" || job.status === "FETCHING_RESULTS") && (
              <div className="text-xs text-muted-foreground flex items-center gap-2">
                <div className="h-1 flex-1 rounded-full bg-primary/10 overflow-hidden">
                  <div className="h-full w-1/3 rounded-full bg-primary/40 animate-pulse" />
                </div>
                <span>{job.status === "FETCHING_RESULTS" ? "Downloading Phase..." : "Processing..."}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
