import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCrawlStatus, getCrawlResults } from "@/lib/cloudflare";
import { scheduleCrawlSync } from "@/lib/qstash";

/**
 * QStash webhook: Checks Cloudflare crawl status and syncs to DB.
 * Uses a two-step approach:
 *  1. Lightweight status check (fast, no records data)
 *  2. If completed, fetch full results separately
 * This avoids Vercel 30s timeouts on large crawl result payloads.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { jobId } = body;

    if (!jobId) {
      return NextResponse.json({ error: "Missing jobId" }, { status: 400 });
    }

    const job = await prisma.crawlJob.findUnique({ where: { id: jobId } });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Already done — skip
    if (job.status === "COMPLETED" || job.status === "FAILED") {
      return NextResponse.json({ status: "already_done" });
    }

    if (!job.cfJobId || job.cfJobId === "pending") {
      return NextResponse.json({ status: "no_cf_job" });
    }

    // Step 1: Lightweight status check (no page records, fast)
    const cfStatus = await getCrawlStatus(job.cfJobId, job.cfAccountId);

    if (!cfStatus.success) {
      await scheduleCrawlSync(jobId, 60);
      return NextResponse.json({ status: "retry_scheduled" });
    }

    if (cfStatus.status === "completed") {
      // Step 2: Fetch full results (may be large)
      // If this times out, we still mark COMPLETED so job isn't stuck forever.
      let resultData: unknown = null;
      let pagesCount = 0;

      try {
        const results = await getCrawlResults(job.cfJobId, job.cfAccountId);
        if (results.success && results.records) {
          resultData = results.records;
          pagesCount = (results.records as Record<string, unknown>[]).filter(
            (p) => p.status === "completed"
          ).length;
        } else {
          console.error(`[crawl-sync] Fetch failed for ${jobId}:`, results.error);
          // If Cloudflare rate limits or returns 5xx when fetching results, 
          // we should retry later rather than saving it as COMPLETED with 0 pages.
          await scheduleCrawlSync(jobId, 60);
          return NextResponse.json({ status: "retry_scheduled_due_to_fetch_error" });
        }
      } catch (err) {
        console.error("[crawl-sync] Result fetch threw error:", err);
        // Also retry on network exception
        await scheduleCrawlSync(jobId, 60);
        return NextResponse.json({ status: "retry_scheduled_due_to_exception" });
      }

      await prisma.crawlJob.update({
        where: { id: jobId },
        data: {
          status: "COMPLETED",
          pagesCrawled: pagesCount,
          resultData: resultData as object,
          completedAt: new Date(),
        },
      });

      return NextResponse.json({ status: "completed", pages: pagesCount });
    }

    if (cfStatus.status === "failed") {
      await prisma.crawlJob.update({
        where: { id: jobId },
        data: { status: "FAILED", error: "Cloudflare crawl failed" },
      });
      return NextResponse.json({ status: "failed" });
    }

    // Still running — re-queue
    await scheduleCrawlSync(jobId, 60);
    return NextResponse.json({ status: "pending", nextCheck: 60 });

  } catch (err) {
    console.error("Crawl sync webhook error:", err);
    return NextResponse.json({ error: "Webhook failed" }, { status: 500 });
  }
}
