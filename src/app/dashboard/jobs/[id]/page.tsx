"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
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
  RefreshCw,
  AlertTriangle,
  ShieldAlert,
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
  const [fetchingResults, setFetchingResults] = useState(false);
  const [resultsError, setResultsError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("chat");
  const [currentPage, setCurrentPage] = useState(0);

  const fetchResults = useCallback(async () => {
    if (!jobId) return;
    setFetchingResults(true);
    setResultsError(null);
    try {
      const res = await fetch(`/api/crawl/${jobId}/results`);
      const data = await res.json();
      if (res.ok && data.success) {
        setJob((prev) => prev ? { ...prev, resultData: data.records, pagesCrawled: data.pagesCrawled ?? prev.pagesCrawled } : prev);
        toast.success(`Loaded ${data.records?.length ?? 0} pages!`);
      } else {
        setResultsError(data.error || "Failed to fetch results from Cloudflare");
        toast.error(data.error || "Failed to fetch results");
      }
    } catch {
      setResultsError("Network error fetching results");
      toast.error("Failed to fetch results");
    } finally {
      setFetchingResults(false);
    }
  }, [jobId]);

  useEffect(() => {
    async function fetchJob() {
      try {
        const res = await fetch(`/api/crawl/${jobId}`);
        if (res.ok) {
          const data = await res.json();
          setJob(data.job);
          // Auto-fetch results if job is completed but resultData is missing
          if (data.job?.status === "COMPLETED" && (!data.job?.resultData || !Array.isArray(data.job?.resultData) || (data.job?.resultData as unknown[]).length === 0)) {
            // slight delay to let UI render first
            setTimeout(() => fetchResults(), 300);
          }
        }
      } catch {
        toast.error("Failed to load job details");
      } finally {
        setLoading(false);
      }
    }
    fetchJob();
  }, [jobId, fetchResults]);

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

  // Full export string with metadata envelope (computed on demand)
  const getFullExportString = () => {
    if (!job) return "";
    
    // For markdown/html downloads, if it's not a structured JSON array, fallback to raw
    if (job.format !== "json" && typeof job.resultData === "string") {
      return job.resultData; 
    }

    const exportData = {
      _type: "crawlmind_export_v1",
      job: {
        query: job.query,
        inputType: job.inputType,
        resolvedUrls: job.resolvedUrls,
        status: job.status,
        config: job.config,
        pagesCrawled: job.pagesCrawled,
        format: job.format,
        createdAt: job.createdAt,
        completedAt: job.completedAt,
        error: job.error,
      },
      records: job.resultData,
    };
    return JSON.stringify(exportData, null, 2);
  };

  const getSiteOrigin = () => {
    try {
      return job?.resolvedUrls?.[0] ? new URL(job.resolvedUrls[0]).origin : null;
    } catch {
      return null;
    }
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
          {/* 7-day expiry warning for free plan users */}
          {job.status === "COMPLETED" && (
            <div className="flex items-center gap-2 text-xs text-yellow-500 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-2 mb-3">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>Results are stored for <strong>7 days</strong>. Download your data before it expires.</span>
            </div>
          )}

          {/* Loading state while fetching from Cloudflare */}
          {fetchingResults && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3 animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin" />
              Fetching results from Cloudflare — this can take up to 30s for large crawls…
            </div>
          )}

          {/* Error state with retry */}
          {resultsError && !fetchingResults && (
            <div className="flex items-center gap-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2 mb-3">
              <XCircle className="w-4 h-4 shrink-0" />
              <span>{resultsError}</span>
              <Button variant="outline" size="sm" onClick={fetchResults} className="ml-auto h-7 text-xs">
                <RefreshCw className="w-3 h-3 mr-1" /> Retry
              </Button>
            </div>
          )}

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
            ) : fetchingResults ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm">Downloading crawled pages from Cloudflare…</p>
                <p className="text-xs">Large crawls may take up to 30 seconds</p>
              </div>
            ) : job.status === "COMPLETED" && completedPages.length === 0 && Array.isArray(job.resultData) ? (
              <div className="flex flex-col items-center justify-center h-full gap-4 text-center max-w-md mx-auto">
                <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center mb-2">
                  <ShieldAlert className="w-6 h-6 text-amber-500" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">Crawl Blocked by robots.txt</h3>
                <p className="text-sm text-muted-foreground">
                  The site owner does not allow automated crawling of this page as per their <strong>robots.txt</strong> policy, or strict anti-bot protection is enabled.
                </p>
                {getSiteOrigin() && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-2 text-primary border-primary/20 hover:bg-primary/10"
                    onClick={() => window.open(`${getSiteOrigin()}/robots.txt`, '_blank', 'noopener,noreferrer')}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View robots.txt
                  </Button>
                )}
              </div>
            ) : currentPageContent && currentPageContent !== "[]" ? (
              job.format === "markdown" ? (
                <MarkdownViewer content={currentPageContent} />
              ) : (
                <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed">
                  {currentPageContent}
                </pre>
              )
            ) : !resultsError ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
                <p className="text-sm">No results yet — crawl may still be in progress.</p>
                {job.status === "COMPLETED" && (
                  <Button variant="outline" size="sm" onClick={fetchResults}>
                    <RefreshCw className="w-4 h-4 mr-1.5" /> Load Results
                  </Button>
                )}
              </div>
            ) : null}
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

