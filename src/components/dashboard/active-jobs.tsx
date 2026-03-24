"use client";

import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, XCircle, Clock, Trash2, Ban } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Job {
  id: string;
  query: string;
  status: string;
  pagesCrawled: number;
  config: { limit?: number };
  startedAt: string;
}

const statusConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  QUEUED: { icon: Clock, color: "text-yellow-500", label: "Queued" },
  RUNNING: { icon: Loader2, color: "text-primary", label: "Crawling Site" },
  FETCHING_RESULTS: { icon: Loader2, color: "text-blue-500", label: "Downloading Data" },
  COMPLETED: { icon: CheckCircle2, color: "text-green-500", label: "Done" },
  PARTIAL: { icon: CheckCircle2, color: "text-orange-500", label: "Partial" },
  FAILED: { icon: XCircle, color: "text-destructive", label: "Failed" },
};

export function ActiveJobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    let timeoutId: NodeJS.Timeout;

    async function fetchJobs() {
      if (!active) return;
      try {
        const res = await fetch("/api/crawl/active");
        if (res.ok) {
          const data = await res.json();
          const fetchedJobs: Job[] = data.jobs || [];
          setJobs(fetchedJobs);

          // Adaptive polling: 3s if active jobs exist, 10s otherwise
          const hasActive = fetchedJobs.some(
            (j) => j.status === "RUNNING" || j.status === "QUEUED" || j.status === "FETCHING_RESULTS"
          );
          timeoutId = setTimeout(fetchJobs, hasActive ? 3000 : 10000);
        } else {
          timeoutId = setTimeout(fetchJobs, 10000);
        }
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

  if (jobs.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        <p>No active crawl jobs. Start one above!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
        Active Jobs
      </h3>
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
