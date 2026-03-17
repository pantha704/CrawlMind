"use client";

import { useEffect, useState } from "react";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  FileText,
  ExternalLink,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import Link from "next/link";

interface CrawlRecord {
  id: string;
  query: string;
  status: string;
  inputType: string;
  pagesCrawled: number;
  format: string;
  createdAt: string;
}

export function RecentCrawls() {
  const [crawls, setCrawls] = useState<CrawlRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRecent() {
      try {
        const res = await fetch("/api/crawl/recent");
        if (res.ok) {
          const data = await res.json();
          setCrawls(data.crawls || []);
        }
      } catch {
        // silent fail
      } finally {
        setLoading(false);
      }
    }
    fetchRecent();
    // Re-fetch every 10s so completed jobs appear automatically
    const interval = setInterval(fetchRecent, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleDelete = async (crawlId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const res = await fetch(`/api/crawl/${crawlId}`, { method: "DELETE" });
      if (res.ok) {
        setCrawls((prev) => prev.filter((c) => c.id !== crawlId));
        toast.success("Crawl archived");
      } else {
        toast.error("Failed to archive crawl");
      }
    } catch {
      toast.error("Failed to archive crawl");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading recent crawls...
      </div>
    );
  }

  if (crawls.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <FileText className="w-12 h-12 mx-auto mb-4 opacity-30" />
        <p className="text-sm">No crawl history yet.</p>
        <p className="text-xs mt-1">Your completed crawls will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
        Recent Crawls
      </h3>
      <div className="space-y-2">
        {crawls.map((crawl) => (
          <div
            key={crawl.id}
            className="group flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 rounded-xl bg-card border border-border/50 hover:border-primary/20 transition-all gap-2 sm:gap-0"
          >
            <Link
              href={`/dashboard/jobs/${crawl.id}`}
              className="flex items-center gap-3 min-w-0 flex-1"
            >
              {crawl.status === "COMPLETED" ? (
                <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 text-destructive shrink-0" />
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{crawl.query}</p>
                <p className="text-xs text-muted-foreground">
                  {crawl.pagesCrawled} pages •{" "}
                  {new Date(crawl.createdAt).toLocaleDateString()} •{" "}
                  {crawl.format}
                </p>
              </div>
            </Link>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-400"
                onClick={(e) => handleDelete(crawl.id, e)}
                title="Archive crawl"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
              <Badge variant="outline" className="text-xs">
                {crawl.inputType}
              </Badge>
              <Link href={`/dashboard/jobs/${crawl.id}`} className="hidden sm:block">
                <ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
