import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getCrawlStatus } from "@/lib/cloudflare";

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    const activeJobs = await prisma.crawlJob.findMany({
      where: {
        userId,
        status: { in: ["QUEUED", "RUNNING", "FETCHING_RESULTS"] },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    // Check Cloudflare for updates for each active job
    const updatedJobs = await Promise.all(
      activeJobs.map(async (job) => {
        if (!job.cfJobId || job.cfJobId === "pending") return job;

        try {
          const cfStatus = await getCrawlStatus(job.cfJobId, job.cfAccountId);

          let newStatus = job.status;
          
          if (cfStatus.success) {
            if (cfStatus.status === "completed") newStatus = "FETCHING_RESULTS";
            if (cfStatus.status === "failed") newStatus = "FAILED";
          } else {
            console.error(`[ACTIVE POLLING] cfStatus returned success: false for job ${job.id}`, cfStatus);
            if (cfStatus.status === "failed") {
              newStatus = "FAILED";
            }
          }

          if (newStatus !== job.status) {
            const updatedJob = await prisma.crawlJob.update({
              where: { id: job.id },
              data: {
                status: newStatus,
              },
            });

            if (newStatus === "FETCHING_RESULTS") {
              const { scheduleCrawlSync } = await import("@/lib/qstash");
              await scheduleCrawlSync({ jobId: job.id, action: "FETCH_CHUNK", cursor: null }, 0);
            }
            
            return updatedJob;
          }
        } catch (e) {
          console.error(`Status sync failed for job ${job.id}:`, e);
        }
        return job;
      })
    );

    return NextResponse.json({ jobs: updatedJobs });
  } catch (err) {
    console.error("Active jobs error:", err);
    return NextResponse.json({ jobs: [] });
  }
}
