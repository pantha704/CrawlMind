import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCrawlStatus, getCrawlResults } from "@/lib/cloudflare";
import { scheduleCrawlSync } from "@/lib/qstash";

export const maxDuration = 60; // Allow Vercel up to 60s since CF results fetch is slow

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
      // 1. Mark as COMPLETED immediately!
      // This guarantees the job never gets stuck in RUNNING even if the background 
      // payload download fails or exceeds Vercel's strict 60s function timeout.
      await prisma.crawlJob.update({
        where: { id: jobId },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
        },
      });

      // 2. Attempt Step 2: Fetch full results in the background
      // If this takes >60s, Vercel kills this lambda and throws a 504.
      // But because we already saved the DB as COMPLETED above, the user 
      // will gracefully fall back to the client-side streaming proxy!
      try {
        const results = await getCrawlResults(job.cfJobId, job.cfAccountId);
        if (results.success && results.records) {
          const pagesCount = (results.records as Record<string, unknown>[]).filter(
            (p) => p.status === "completed"
          ).length;

          // 3. Update the DB again with the actual heavy payload
          await prisma.crawlJob.update({
            where: { id: jobId },
            data: {
              pagesCrawled: pagesCount,
              resultData: results.records as object,
            },
          });
          return NextResponse.json({ status: "completed", pages: pagesCount });
        }
      } catch (err) {
        console.error("[crawl-sync] Result fetch threw error (or timed out):", err);
        // It's fine to swallow this error. The job is COMPLETED, resultData is null.
        // The frontend streaming proxy (/api/crawl/[id]/results) will pick up the slack!
      }

      return NextResponse.json({ status: "completed_but_results_deferred" });
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
