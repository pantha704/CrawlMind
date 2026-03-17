import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCrawlStatus } from "@/lib/cloudflare";

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

    // Sync with Cloudflare if running
    if (job.status === "RUNNING" || job.status === "QUEUED") {
      if (job.cfJobId && job.cfJobId !== "pending") {
        try {
          const cfStatus = await getCrawlStatus(job.cfJobId);
          if (cfStatus.success) {
            let newStatus = job.status;
            if (cfStatus.status === "completed") newStatus = "COMPLETED";
            if (cfStatus.status === "failed") newStatus = "FAILED";

            const resultData = cfStatus.data as Record<string, unknown>;
            let pagesCount = job.pagesCrawled;

            if (Array.isArray(resultData)) {
              pagesCount = resultData.filter((p: Record<string, unknown>) => p.status === "completed").length;
            } else if (resultData?.pages_crawled) {
              pagesCount = resultData.pages_crawled as number;
            } else if (resultData?.total_pages) {
              pagesCount = resultData.total_pages as number;
            }

            const updatedJob = await prisma.crawlJob.update({
              where: { id: job.id },
              data: {
                status: newStatus,
                pagesCrawled: pagesCount,
                resultData: cfStatus.status === "completed" ? (resultData as object) : (job.resultData ?? undefined),
                completedAt: cfStatus.status === "completed" ? new Date() : undefined,
              },
            });
            return NextResponse.json({ job: updatedJob });
          }
        } catch (e) {
          console.error(`Sync failed for job ${id}:`, e);
        }
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
