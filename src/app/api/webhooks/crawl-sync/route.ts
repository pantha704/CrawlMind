import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCrawlStatus } from "@/lib/cloudflare";
import { scheduleCrawlSync } from "@/lib/qstash";

/**
 * QStash webhook: Checks Cloudflare crawl status and syncs to DB.
 * If still pending, re-queues itself with exponential backoff.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { jobId } = body;

    if (!jobId) {
      return NextResponse.json({ error: "Missing jobId" }, { status: 400 });
    }

    const job = await prisma.crawlJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Already completed or failed — no action needed
    if (job.status === "COMPLETED" || job.status === "FAILED") {
      return NextResponse.json({ status: "already_done" });
    }

    // Check Cloudflare status
    if (!job.cfJobId || job.cfJobId === "pending") {
      return NextResponse.json({ status: "no_cf_job" });
    }

    const cfStatus = await getCrawlStatus(job.cfJobId);

    if (!cfStatus.success) {
      // Re-queue with longer delay
      await scheduleCrawlSync(jobId, 60);
      return NextResponse.json({ status: "retry_scheduled" });
    }

    if (cfStatus.status === "completed") {
      const resultData = cfStatus.data;
      let pagesCount = 0;

      if (Array.isArray(resultData)) {
        pagesCount = resultData.filter(
          (p: Record<string, unknown>) => p.status === "completed"
        ).length;
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
        data: {
          status: "FAILED",
          error: "Cloudflare crawl failed",
        },
      });
      return NextResponse.json({ status: "failed" });
    }

    // Still pending — re-queue with exponential backoff
    // Increase delay: 30s → 60s → 120s → 240s (max 5 min)
    const currentDelay = 30;
    const nextDelay = Math.min(currentDelay * 2, 300);
    await scheduleCrawlSync(jobId, nextDelay);

    return NextResponse.json({ status: "pending", nextCheck: nextDelay });
  } catch (err) {
    console.error("Crawl sync webhook error:", err);
    return NextResponse.json(
      { error: "Webhook failed" },
      { status: 500 }
    );
  }
}
