import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCrawlStatus, getAllCrawlResults } from "@/lib/cloudflare";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const job = await prisma.crawlJob.findUnique({
      where: { id },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // If still running, check CF status and fetch results inline if completed
    if (job.status === "RUNNING" || job.status === "QUEUED") {
      if (job.cfJobId && job.cfJobId !== "pending") {
        try {
          const cfStatus = await getCrawlStatus(job.cfJobId, job.cfAccountId);
          
          if (cfStatus.success && cfStatus.status === "completed") {
            // Mark as fetching (lock)
            await prisma.crawlJob.update({
              where: { id: job.id },
              data: { status: "FETCHING_RESULTS" },
            });

            // Inline fetch all results
            const results = await getAllCrawlResults(job.cfJobId, job.cfAccountId);

            const updatedJob = await prisma.crawlJob.update({
              where: { id: job.id },
              data: {
                status: results.success && results.records.length > 0 ? "COMPLETED" : "FAILED",
                resultData: results.records.length > 0 ? (results.records as object) : undefined,
                pagesCrawled: results.records.length,
                completedAt: new Date(),
                ...((!results.success || results.records.length === 0) && {
                  error: results.error || "No results returned",
                }),
              },
            });

            return NextResponse.json({ job: updatedJob });
          }

          if (cfStatus.status === "failed") {
            const updatedJob = await prisma.crawlJob.update({
              where: { id: job.id },
              data: { status: "FAILED", error: "Cloudflare crawl failed" },
            });
            return NextResponse.json({ job: updatedJob });
          }
        } catch (e) {
          console.error(`Sync failed for job ${id}:`, e);
        }
      }
    } else if (job.status === "FETCHING_RESULTS") {
      // Another request is fetching results — just return current state
      // If stuck for > 10 min, mark failed
      const staleMs = Date.now() - new Date(job.updatedAt).getTime();
      if (staleMs > 10 * 60 * 1000) {
        const failedJob = await prisma.crawlJob.update({
          where: { id: job.id },
          data: {
            status: "FAILED",
            error: "Timeout: result fetch took too long.",
          },
        });
        return NextResponse.json({ job: failedJob });
      }
    }

    return NextResponse.json({ job });
  } catch (err) {
    console.error("Job detail error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.crawlJob.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Delete job error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
