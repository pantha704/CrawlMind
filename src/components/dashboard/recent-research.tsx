"use client";

import { useEffect, useState } from "react";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Brain,
  Zap,
  Search,
  ExternalLink,
  FileText,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

interface ResearchRecord {
  id: string;
  query: string;
  status: string;
  depthLevel: string;
  createdAt: string;
  completedAt: string | null;
  totalSources: number;
  totalPages: number;
  hasSynthesis: boolean;
}

const depthIcons: Record<string, typeof Zap> = {
  QUICK: Zap,
  STANDARD: Search,
  RESEARCH: Brain,
};

const depthLabels: Record<string, string> = {
  QUICK: "Quick Scan",
  STANDARD: "Deep Dive",
  RESEARCH: "Research",
};

export function RecentResearch() {
  const [jobs, setJobs] = useState<ResearchRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRecent() {
      try {
        const res = await fetch("/api/research/recent");
        if (res.ok) {
          const data = await res.json();
          setJobs(data.researchJobs || []);
        }
      } catch {
        // silent fail
      } finally {
        setLoading(false);
      }
    }
    fetchRecent();
    const interval = setInterval(fetchRecent, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading research history...
      </div>
    );
  }

  if (jobs.length === 0) return null; // Don't show section if no research jobs exist

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
        <Brain className="w-4 h-4 text-purple-400" />
        Recent Research
      </h3>
      <div className="space-y-2">
        {jobs.map((job) => {
          const DepthIcon = depthIcons[job.depthLevel] || Brain;
          return (
            <Link
              key={job.id}
              href={`/dashboard/research/${job.id}`}
              className="group flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 rounded-xl bg-card border border-purple-500/20 hover:border-purple-500/40 transition-all gap-2 sm:gap-0"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {job.status === "SYNTHESIZED" || job.status === "COMPLETED" ? (
                  <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-destructive shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{job.query}</p>
                  <p className="text-xs text-muted-foreground">
                    {job.totalSources} sources • {job.totalPages} pages •{" "}
                    {new Date(job.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {job.hasSynthesis && (
                  <Badge variant="outline" className="text-xs border-purple-500/30 text-purple-400">
                    <FileText className="w-3 h-3 mr-1" />
                    Report
                  </Badge>
                )}
                <Badge variant="outline" className="text-xs">
                  <DepthIcon className="w-3 h-3 mr-1" />
                  {depthLabels[job.depthLevel] || job.depthLevel}
                </Badge>
                <ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
