import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getAllCrawlResults } from "@/lib/cloudflare";

/**
 * GET /api/crawl/[id]/results
 * 
 * Fetches crawl results from CF (via cursor pagination) and caches in DB.
 * Returns cached results on subsequent calls.
 */
export const maxDuration = 60;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const job = await prisma.crawlJob.findUnique({
      where: { id },
      select: { id: true, cfJobId: true, cfAccountId: true, status: true, userId: true, resultData: true, pagesCrawled: true },
    });

    if (!job || job.userId !== session.user.id) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // If we already have saved results, return them instantly from DB
    if (job.resultData && Array.isArray(job.resultData) && (job.resultData as unknown[]).length > 0) {
      return NextResponse.json({ success: true, records: job.resultData, pagesCrawled: job.pagesCrawled, source: "db" });
    }

    if (!job.cfJobId || job.cfJobId === "pending") {
      return NextResponse.json({ error: "No Cloudflare job ID" }, { status: 400 });
    }

    // Fetch all results from CF using cursor pagination (consistent with active route)
    const results = await getAllCrawlResults(job.cfJobId, job.cfAccountId);

    if (!results.success || results.records.length === 0) {
      return NextResponse.json({ 
        error: results.error || "No results returned from Cloudflare",
        records: [],
      }, { status: 502 });
    }

    // Deduplicate by URL
    const seen = new Set<string>();
    const uniqueRecords = results.records.filter((r: unknown) => {
      const url = (r as Record<string, unknown>).url as string;
      if (!url || seen.has(url)) return false;
      seen.add(url);
      return true;
    });

    const completedCount = uniqueRecords.filter(
      (p: unknown) => (p as Record<string, unknown>).status === "completed"
    ).length;

    // Save to DB for future instant loads
    await prisma.crawlJob.update({
      where: { id: job.id },
      data: {
        status: "COMPLETED",
        resultData: uniqueRecords as object,
        pagesCrawled: completedCount,
        completedAt: new Date(),
      },
    });

    console.log(`[results] Saved ${uniqueRecords.length} unique records (${completedCount} completed) for job ${job.id}`);

    return NextResponse.json({
      success: true,
      records: uniqueRecords,
      pagesCrawled: completedCount,
      source: "cloudflare",
    });
  } catch (err) {
    console.error("[results] Error:", err);
    return NextResponse.json({ error: "Failed to fetch results" }, { status: 500 });
  }
}
