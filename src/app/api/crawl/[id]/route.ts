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
          const cfStatus = await getCrawlStatus(job.cfJobId, job.cfAccountId);
          if (cfStatus.success) {
            let newStatus = job.status;
            if (cfStatus.status === "completed") newStatus = "FETCHING_RESULTS";
            if (cfStatus.status === "failed") newStatus = "FAILED";

            if (newStatus !== job.status) {
              const updatedJob = await prisma.crawlJob.update({
                where: { id: job.id },
                data: {
                  status: newStatus,
                },
              });
              
              if (newStatus === "FETCHING_RESULTS") {
                // Kickstart the background fetch process
                const { scheduleCrawlSync } = await import("@/lib/qstash");
                await scheduleCrawlSync({ jobId: job.id, action: "FETCH_CHUNK", cursor: null }, 0);
              }
              
              return NextResponse.json({ job: updatedJob });
            }
          }
        } catch (e) {
          console.error(`Sync failed for job ${id}:`, e);
        }
      }
    } else if (job.status === "FETCHING_RESULTS") {
      // Just in case the webhook died, kickstart it when the user visits the page
      try {
        const { scheduleCrawlSync } = await import("@/lib/qstash");
        await scheduleCrawlSync({ jobId: job.id, action: "FETCH_CHUNK", cursor: null }, 0);
      } catch (e) {
         console.error(`Failed to schedule chunk restart for ${id}:`, e);
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
