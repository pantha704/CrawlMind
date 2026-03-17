"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Download,
  Copy,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { AiChatPanel } from "@/components/dashboard/ai-chat-panel";
import { MarkdownViewer } from "@/components/dashboard/markdown-viewer";

interface JobDetail {
  id: string;
  query: string;
  status: string;
  inputType: string;
  resolvedUrls: string[];
  pagesCrawled: number;
  format: string;
  config: Record<string, unknown>;
  resultData: unknown;
  error: string | null;
  createdAt: string;
  completedAt: string | null;
}

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.id as string;
  const [job, setJob] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [activeTab, setActiveTab] = useState("chat");
  const [currentPage, setCurrentPage] = useState(0);

  useEffect(() => {
    async function fetchJob() {
      try {
        const res = await fetch(`/api/crawl/${jobId}`);
        if (res.ok) {
          const data = await res.json();
          setJob(data.job);
        }
      } catch {
        toast.error("Failed to load job details");
      } finally {
        setLoading(false);
      }
    }
    fetchJob();
  }, [jobId]);

  // Parse result pages lazily — separate completed vs skipped
  const { completedPages, skippedCount } = useMemo(() => {
    if (!job?.resultData || !Array.isArray(job.resultData)) {
      return { completedPages: [], skippedCount: 0 };
    }
    const completed = job.resultData.filter(
      (p: Record<string, unknown>) => p.status === "completed" && (p.markdown || p.content || p.html)
    );
    const skipped = job.resultData.length - completed.length;
    return { completedPages: completed, skippedCount: skipped };
  }, [job?.resultData]);

  // Only stringify the current page or fallback — never the whole blob at once
  const currentPageContent = useMemo(() => {
    if (activeTab !== "results") return "";
    if (completedPages.length > 0) {
      const page = completedPages[currentPage];
      if (!page) return "No data for this page.";
      return page.markdown || page.content || JSON.stringify(page, null, 2);
    }
    // Fallback: not an array, stringify with truncation
    if (typeof job?.resultData === "string") return job.resultData;
    const full = JSON.stringify(job?.resultData, null, 2);
    if (full.length > 50000) {
      return full.slice(0, 50000) + "\n\n... [truncated — use Export to get full data]";
    }
    return full;
  }, [activeTab, job?.resultData, completedPages, currentPage]);

  // Full export string (computed only on demand)
  const getFullExportString = () => {
    if (typeof job?.resultData === "string") return job.resultData;
    return JSON.stringify(job?.resultData, null, 2);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p>Job not found</p>
      </div>
    );
  }

  const statusIcon =
    job.status === "COMPLETED" ? (
      <CheckCircle2 className="w-5 h-5 text-green-500" />
    ) : job.status === "FAILED" ? (
      <XCircle className="w-5 h-5 text-destructive" />
    ) : job.status === "RUNNING" ? (
      <Loader2 className="w-5 h-5 text-primary animate-spin" />
    ) : (
      <Clock className="w-5 h-5 text-yellow-500" />
    );

  const handleCopy = async () => {
    const text = completedPages.length > 0
      ? (completedPages[currentPage]?.markdown || completedPages[currentPage]?.content || JSON.stringify(completedPages[currentPage], null, 2))
      : getFullExportString();
    await navigator.clipboard.writeText(text || "");
    toast.success("Copied to clipboard");
  };

  const handleRetry = async () => {
    if (!job) return;
    setRetrying(true);
    try {
      const config = job.config as Record<string, unknown>;
      const res = await fetch("/api/crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: job.query,
          inputType: job.inputType,
          depth: config?.depth || 2,
          limit: config?.limit || 30,
          format: job.format,
          render: config?.render || false,
        }),
      });
      if (!res.ok) throw new Error("Retry failed");
      const data = await res.json();
      toast.success("Crawl restarted!");
      router.push(`/dashboard/jobs/${data.jobId}`);
    } catch {
      toast.error("Failed to retry crawl");
    } finally {
      setRetrying(false);
    }
  };

  const handleDownload = () => {
    const ext = job.format === "markdown" ? "md" : job.format === "html" ? "html" : "json";
    const exportStr = getFullExportString();
    const blob = new Blob([exportStr || ""], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `crawl-${job.id}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Download started");
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            {statusIcon}
            <h1 className="text-xl font-bold">{job.query}</h1>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline">{job.inputType}</Badge>
            <Badge variant="outline">{job.format}</Badge>
            <span className="text-xs text-muted-foreground">
              {job.pagesCrawled} pages • {new Date(job.createdAt).toLocaleString()}
            </span>
          </div>
          {job.resolvedUrls.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-1">
              {job.resolvedUrls.map((url) => (
                <a
                  key={url}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <ExternalLink className="w-3 h-3" />
                  {new URL(url).hostname}
                </a>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-2 shrink-0 flex-wrap">
          {job.status === "FAILED" && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRetry}
              disabled={retrying}
              className="text-amber-400 border-amber-400/30 hover:bg-amber-400/10"
            >
              {retrying ? (
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              ) : (
                <RotateCcw className="w-4 h-4 mr-1.5" />
              )}
              Retry Crawl
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleCopy}>
            <Copy className="w-4 h-4 mr-1.5" />
            Copy
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="w-4 h-4 mr-1.5" />
            Export
          </Button>
        </div>
      </div>

      <Separator />

      {/* Tabs: Results + AI Chat */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="chat">AI Chat</TabsTrigger>
          <TabsTrigger value="results">Raw Results</TabsTrigger>
          <TabsTrigger value="config">Config</TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="mt-0">
          <AiChatPanel jobId={jobId} />
        </TabsContent>

        <TabsContent value="results" className="mt-0">
          {/* Per-page navigation for crawled records */}
          {completedPages.length > 1 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 px-1 gap-2">
              <span className="text-sm text-muted-foreground truncate">
                Page {currentPage + 1} of {completedPages.length}
                {skippedCount > 0 && (
                  <> · <span className="text-yellow-500">{skippedCount} skipped</span></>
                )}
                {completedPages[currentPage]?.url && (
                  <> — <a href={completedPages[currentPage].url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{completedPages[currentPage].url}</a></>
                )}
              </span>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  disabled={currentPage === 0}
                  onClick={() => setCurrentPage(p => p - 1)}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  disabled={currentPage >= completedPages.length - 1}
                  onClick={() => setCurrentPage(p => p + 1)}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          <ScrollArea className="h-[400px] sm:h-[600px] rounded-xl border border-border/50 bg-card p-4 sm:p-6">
            {job.error ? (
              <div className="text-destructive text-sm">
                <p className="font-medium">Error</p>
                <p>{job.error}</p>
              </div>
            ) : currentPageContent ? (
              job.format === "markdown" ? (
                <MarkdownViewer content={currentPageContent} />
              ) : (
                <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed">
                  {currentPageContent}
                </pre>
              )
            ) : (
              <p className="text-muted-foreground text-sm">
                No results yet — crawl may still be in progress.
              </p>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="config" className="mt-0">
          <div className="rounded-xl border border-border/50 bg-card p-6">
            <pre className="text-sm text-muted-foreground font-mono">
              {JSON.stringify(job.config, null, 2)}
            </pre>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

