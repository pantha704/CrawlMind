"use client";

import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, XCircle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

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
  RUNNING: { icon: Loader2, color: "text-primary", label: "Running" },
  COMPLETED: { icon: CheckCircle2, color: "text-green-500", label: "Done" },
  PARTIAL: { icon: CheckCircle2, color: "text-orange-500", label: "Partial" },
  FAILED: { icon: XCircle, color: "text-destructive", label: "Failed" },
};

export function ActiveJobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchJobs() {
      try {
        const res = await fetch("/api/crawl/active");
        if (res.ok) {
          const data = await res.json();
          setJobs(data.jobs || []);
        }
      } catch {
        // silent fail for now
      } finally {
        setLoading(false);
      }
    }
    fetchJobs();
    const interval = setInterval(fetchJobs, 5000);
    return () => clearInterval(interval);
  }, []);

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
        const progress = job.config?.limit
          ? Math.min((job.pagesCrawled / job.config.limit) * 100, 100)
          : 0;

        return (
          <div
            key={job.id}
            className="p-4 rounded-xl bg-card border border-border/50 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <Icon
                  className={`w-4 h-4 shrink-0 ${cfg.color} ${
                    job.status === "RUNNING" ? "animate-spin" : ""
                  }`}
                />
                <span className="text-sm font-medium truncate">
                  {job.query}
                </span>
              </div>
              <Badge variant="outline" className="shrink-0 text-xs">
                {cfg.label}
              </Badge>
            </div>

            {job.status === "RUNNING" && (
              <div className="space-y-1.5">
                <Progress value={progress} className="h-1.5" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{job.pagesCrawled} pages crawled</span>
                  <span>{Math.round(progress)}%</span>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
