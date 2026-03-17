"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Archive,
  Trash2,
  ExternalLink,
  Loader2,
  Globe,
  Sparkles,
  Clock,
  FileText,
  FolderOpen,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

interface CrawlJob {
  id: string;
  query: string;
  status: string;
  inputType: string;
  pagesCrawled: number;
  format: string;
  createdAt: string;
  deletedAt?: string | null;
}

export default function LibraryPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<CrawlJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("active");

  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch("/api/crawl/library");
      const data = await res.json();
      setJobs(data.crawls || []);
    } catch {
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const handleDelete = async (jobId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/crawl/${jobId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        // Move to "deleted" state locally
        setJobs((prev) =>
          prev.map((j) =>
            j.id === jobId ? { ...j, deletedAt: new Date().toISOString() } : j
          )
        );
        toast.success("Crawl archived");
      } else {
        toast.error("Failed to archive crawl");
      }
    } catch {
      toast.error("Failed to archive crawl");
    }
  };

  const handleRestore = async (jobId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/crawl/${jobId}/restore`, {
        method: "POST",
      });
      if (res.ok) {
        setJobs((prev) =>
          prev.map((j) =>
            j.id === jobId ? { ...j, deletedAt: null } : j
          )
        );
        toast.success("Crawl restored");
      } else {
        toast.error("Failed to restore");
      }
    } catch {
      toast.error("Failed to restore");
    }
  };

  const activeJobs = jobs.filter((j) => !j.deletedAt);
  const deletedJobs = jobs.filter((j) => j.deletedAt);

  const renderJobCard = (job: CrawlJob, isDeleted: boolean) => (
    <motion.div
      key={job.id}
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`group p-4 rounded-xl border transition-all cursor-pointer ${
        isDeleted
          ? "bg-card/20 border-border/20 opacity-60"
          : "bg-card/50 border-border/40 hover:border-border hover:bg-card"
      }`}
      onClick={() => {
        if (!isDeleted) router.push(`/dashboard/jobs/${job.id}`);
      }}
    >
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          {job.inputType === "PLAINTEXT" ? (
            <Sparkles className="w-4 h-4 text-amber-400" />
          ) : (
            <Globe className="w-4 h-4 text-primary" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{job.query}</p>
          <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <FileText className="w-3 h-3" />
              {job.pagesCrawled} pages
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {new Date(job.createdAt).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })}
            </span>
            <Badge
              variant="outline"
              className={`text-[10px] px-1.5 py-0 ${
                job.status === "COMPLETED" ? "text-green-500 border-green-500/30" :
                job.status === "FAILED" ? "text-red-500 border-red-500/30" :
                job.status === "RUNNING" ? "text-blue-500 border-blue-500/30" :
                "text-yellow-500 border-yellow-500/30"
              }`}
            >
              {job.status}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {isDeleted ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => handleRestore(job.id, e)}
              title="Restore"
            >
              <Archive className="w-4 h-4" />
            </Button>
          ) : (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-red-400"
                onClick={(e) => handleDelete(job.id, e)}
                title="Archive"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/dashboard/jobs/${job.id}`);
                }}
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Library</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Permanent record of all crawls — archive or restore anytime
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-card/50 border border-border/30">
          <TabsTrigger value="active" className="text-sm">
            Active
            <Badge variant="secondary" className="ml-2 text-[10px]">
              {activeJobs.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="archived" className="text-sm">
            Archived
            <Badge variant="secondary" className="ml-2 text-[10px]">
              {deletedJobs.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-4">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : activeJobs.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="grid gap-2">
              {activeJobs.map((job) => renderJobCard(job, false))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="archived" className="mt-4">
          {deletedJobs.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <Archive className="w-10 h-10 mx-auto mb-4 opacity-40" />
              <p className="text-lg font-medium">No archived crawls</p>
              <p className="text-sm mt-1">
                Archived crawls will appear here
              </p>
            </div>
          ) : (
            <div className="grid gap-2">
              {deletedJobs.map((job) => renderJobCard(job, true))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EmptyState() {
  const router = useRouter();
  return (
    <div className="text-center py-20 text-muted-foreground">
      <FolderOpen className="w-10 h-10 mx-auto mb-4 opacity-40" />
      <p className="text-lg font-medium">No saved results yet</p>
      <p className="text-sm mt-1">
        Your crawl results will appear here after completion
      </p>
      <Button
        variant="outline"
        className="mt-4"
        onClick={() => router.push("/dashboard")}
      >
        Start a Crawl
      </Button>
    </div>
  );
}
