"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronLeft,
  Brain,
  Zap,
  Search,
  ExternalLink,
  FileText,
} from "lucide-react";
import { toast } from "sonner";

interface SubJob {
  id: string;
  query: string;
  status: string;
  pagesCrawled: number;
  createdAt: string;
  completedAt: string | null;
  error: string | null;
}

interface ResearchDetail {
  id: string;
  query: string;
  status: string;
  depthLevel: string;
  round: number;
  maxRounds: number;
  discoveredUrls: string[];
  synthesis: string | null;
  synthesisModel: string | null;
  error: string | null;
  totalPages: number;
  subJobs: SubJob[];
  createdAt: string;
  completedAt: string | null;
}

const depthConfig = {
  QUICK: { icon: Zap, label: "Quick Scan", color: "text-yellow-400" },
  STANDARD: { icon: Search, label: "Deep Dive", color: "text-blue-400" },
  RESEARCH: { icon: Brain, label: "Multi-hop Research", color: "text-purple-400" },
} as const;

const statusColors: Record<string, string> = {
  DISCOVERING: "text-purple-400",
  CRAWLING: "text-primary",
  SYNTHESIZING: "text-amber-400",
  COMPLETED: "text-green-500",
  FAILED: "text-destructive",
};

export default function ResearchDetailPage() {
  const params = useParams();
  const router = useRouter();
  const researchId = params.id as string;
  const [research, setResearch] = useState<ResearchDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchResearch = useCallback(async () => {
    try {
      const res = await fetch(`/api/research/${researchId}`);
      if (!res.ok) throw new Error("Failed to fetch research job");
      const data = await res.json();
      setResearch(data);
    } catch {
      toast.error("Failed to load research job");
    } finally {
      setLoading(false);
    }
  }, [researchId]);

  // Initial fetch + poll when in-progress
  useEffect(() => {
    fetchResearch();
    let interval: NodeJS.Timeout;

    const pollIfActive = () => {
      interval = setInterval(async () => {
        const res = await fetch(`/api/research/${researchId}`);
        if (res.ok) {
          const data = await res.json();
          setResearch(data);
          if (["COMPLETED", "FAILED"].includes(data.status)) {
            clearInterval(interval);
          }
        }
      }, 4000);
    };

    pollIfActive();
    return () => clearInterval(interval);
  }, [researchId, fetchResearch]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    );
  }

  if (!research) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Research job not found.</p>
        <Button variant="link" onClick={() => router.push("/dashboard")}>Back to Dashboard</Button>
      </div>
    );
  }

  const depthCfg = depthConfig[research.depthLevel as keyof typeof depthConfig] || depthConfig.QUICK;
  const DepthIcon = depthCfg.icon;
  const isActive = ["DISCOVERING", "CRAWLING", "SYNTHESIZING"].includes(research.status);
  const completedSubs = research.subJobs.filter(j => j.status === "COMPLETED").length;
  const failedSubs = research.subJobs.filter(j => j.status === "FAILED").length;
  const totalSubs = research.subJobs.length;
  const progress = totalSubs > 0 ? (completedSubs / totalSubs) * 100 : 0;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/dashboard")}
          className="shrink-0 mt-1"
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Brain className="w-5 h-5 text-purple-400" />
            <h1 className="text-xl font-semibold truncate">{research.query}</h1>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className={`${depthCfg.color} border-purple-500/30`}>
              <DepthIcon className="w-3 h-3 mr-1" />
              {depthCfg.label}
            </Badge>
            <Badge
              variant="outline"
              className={statusColors[research.status] || "text-muted-foreground"}
            >
              {research.status === "CRAWLING" && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
              {research.status === "SYNTHESIZING" && <Brain className="w-3 h-3 mr-1 animate-pulse" />}
              {research.status === "COMPLETED" && <CheckCircle2 className="w-3 h-3 mr-1" />}
              {research.status === "FAILED" && <XCircle className="w-3 h-3 mr-1" />}
              {research.status}
            </Badge>
            {research.depthLevel === "RESEARCH" && (
              <span className="text-xs text-muted-foreground">
                Round {research.round}/{research.maxRounds}
              </span>
            )}
            <span className="text-xs text-muted-foreground">
              · {research.totalPages} total pages · {totalSubs} sources
            </span>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      {isActive && (
        <div className="space-y-2">
          <div className="h-2 rounded-full bg-purple-500/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-purple-500 to-primary transition-all duration-700"
              style={{ width: research.status === "SYNTHESIZING" ? "90%" : `${Math.max(progress, 5)}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground text-center">
            {research.status === "SYNTHESIZING"
              ? "🧠 AI is synthesizing results into a final report..."
              : `📡 Crawled ${completedSubs}/${totalSubs} sources (${research.totalPages} pages gathered)`
            }
          </p>
        </div>
      )}

      {/* Error */}
      {research.error && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-sm text-destructive">
          <strong>Error:</strong> {research.error}
        </div>
      )}

      {/* Sub-Jobs Grid */}
      <div className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Discovered Sources ({totalSubs})
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {research.subJobs.map((sub) => {
            const isRunning = sub.status === "RUNNING";
            const isDone = sub.status === "COMPLETED";
            const isFailed = sub.status === "FAILED";

            return (
              <div
                key={sub.id}
                className={`p-3 rounded-lg border transition-all ${
                  isDone
                    ? "bg-green-500/5 border-green-500/20"
                    : isFailed
                    ? "bg-destructive/5 border-destructive/20"
                    : isRunning
                    ? "bg-primary/5 border-primary/20"
                    : "bg-card border-border/30"
                }`}
              >
                <div className="flex items-center gap-2">
                  {isRunning && <Loader2 className="w-3.5 h-3.5 text-primary animate-spin shrink-0" />}
                  {isDone && <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />}
                  {isFailed && <XCircle className="w-3.5 h-3.5 text-destructive shrink-0" />}
                  <span className="text-xs font-medium truncate flex-1" title={sub.query}>
                    {(() => {
                      try {
                        const url = new URL(sub.query);
                        return url.hostname.replace("www.", "");
                      } catch {
                        return sub.query;
                      }
                    })()}
                  </span>
                  {isDone && (
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {sub.pagesCrawled} pages
                    </span>
                  )}
                  <a
                    href={sub.query}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                {sub.error && (
                  <p className="mt-1 text-[10px] text-destructive truncate">{sub.error}</p>
                )}
              </div>
            );
          })}
        </div>
        {failedSubs > 0 && (
          <p className="text-xs text-muted-foreground">
            {failedSubs} source(s) failed — remaining {completedSubs} sources used for synthesis.
          </p>
        )}
      </div>

      {/* Synthesis Report */}
      {research.synthesis && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-4 h-4" />
              AI Synthesis Report
            </h2>
            {research.synthesisModel && (
              <span className="text-[10px] text-muted-foreground">
                Model: {research.synthesisModel}
              </span>
            )}
          </div>
          <div className="p-6 rounded-xl bg-card border border-border/50 prose prose-invert max-w-none prose-sm">
            {research.synthesis.split("\n").map((line, i) => {
              if (line.startsWith("# ")) return <h1 key={i} className="text-lg font-bold mt-4 mb-2">{line.slice(2)}</h1>;
              if (line.startsWith("## ")) return <h2 key={i} className="text-base font-semibold mt-3 mb-1">{line.slice(3)}</h2>;
              if (line.startsWith("### ")) return <h3 key={i} className="text-sm font-semibold mt-2 mb-1">{line.slice(4)}</h3>;
              if (line.startsWith("- ")) return <li key={i} className="ml-4 text-sm">{line.slice(2)}</li>;
              if (line.trim() === "") return <br key={i} />;
              return <p key={i} className="text-sm leading-relaxed">{line}</p>;
            })}
          </div>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              navigator.clipboard.writeText(research.synthesis || "");
              toast.success("Synthesis copied to clipboard!");
            }}
          >
            Copy Full Report
          </Button>
        </div>
      )}

      {/* Metadata */}
      <div className="text-xs text-muted-foreground space-y-1 border-t border-border/30 pt-4">
        <p>Created: {new Date(research.createdAt).toLocaleString()}</p>
        {research.completedAt && <p>Completed: {new Date(research.completedAt).toLocaleString()}</p>}
        <p>Discovered URLs: {research.discoveredUrls.length}</p>
      </div>
    </div>
  );
}
