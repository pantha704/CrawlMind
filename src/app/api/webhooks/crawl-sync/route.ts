import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCrawlStatus, getCrawlResultsChunk } from "@/lib/cloudflare";
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
    const { jobId, action = "SYNC", cursor } = body;

    if (!jobId) {
      return NextResponse.json({ error: "Missing jobId" }, { status: 400 });
    }

    const job = await prisma.crawlJob.findUnique({ where: { id: jobId } });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    if (job.status === "COMPLETED" || job.status === "FAILED") {
      return NextResponse.json({ status: "already_done" });
    }

    if (!job.cfJobId || job.cfJobId === "pending") {
      return NextResponse.json({ status: "no_cf_job" });
    }

    if (action === "FETCH_CHUNK") {
      // Chunking mode! This takes ~7-10 seconds per request.
      const chunkResult = await getCrawlResultsChunk(job.cfJobId, job.cfAccountId, cursor);
      
      if (!chunkResult.success) {
        console.error("[crawl-sync] Chunk fetch failed:", chunkResult.error);
        await scheduleCrawlSync({ jobId, action: "FETCH_CHUNK", cursor }, 10);
        return NextResponse.json({ status: "chunk_retry_scheduled" });
      }

      // Append records
      const existingData = Array.isArray(job.resultData) ? job.resultData : [];
      const newRecords = chunkResult.records || [];
      const mergedData = [...existingData, ...newRecords];
      
      // Update DB
      await prisma.crawlJob.update({
        where: { id: jobId },
        data: {
          resultData: mergedData as object,
          pagesCrawled: mergedData.length,
        },
      });

      if (chunkResult.cursor) {
        // More chunks remaining
        await scheduleCrawlSync({ jobId, action: "FETCH_CHUNK", cursor: chunkResult.cursor }, 0); // Immediately enqueue next
        return NextResponse.json({ status: "chunk_saved_more_remaining", cursor: chunkResult.cursor });
      } else {
        // Done! All chunks fetched.
        await prisma.crawlJob.update({
          where: { id: jobId },
          data: {
            status: "COMPLETED",
            completedAt: new Date(),
          },
        });
        return NextResponse.json({ status: "fully_completed", pages: mergedData.length });
      }
    }

    // Step 1: Lightweight status check (action === "SYNC")
    const cfStatus = await getCrawlStatus(job.cfJobId, job.cfAccountId);

    if (!cfStatus.success) {
      await scheduleCrawlSync({ jobId, action: "SYNC" }, 60);
      return NextResponse.json({ status: "retry_scheduled" });
    }

    if (cfStatus.status === "completed") {
      // Crawl finished. Initiate the chunk fetching process.
      await prisma.crawlJob.update({
        where: { id: jobId },
        data: { status: "FETCHING_RESULTS" },
      });
      // Enqueue the first chunk immediately
      await scheduleCrawlSync({ jobId, action: "FETCH_CHUNK", cursor: null }, 0);
      return NextResponse.json({ status: "fetching_started" });
    }

    if (cfStatus.status === "failed") {
      await prisma.crawlJob.update({
        where: { id: jobId },
        data: { status: "FAILED", error: "Cloudflare crawl failed" },
      });
      return NextResponse.json({ status: "failed" });
    }

    // Still running — re-queue
    await scheduleCrawlSync({ jobId, action: "SYNC" }, 60);
    return NextResponse.json({ status: "pending", nextCheck: 60 });

  } catch (err) {
    console.error("Crawl sync webhook error:", err);
    return NextResponse.json({ error: "Webhook failed" }, { status: 500 });
  }
}
