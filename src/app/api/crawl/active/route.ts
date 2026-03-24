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

        // Smart recovery for FETCHING_RESULTS jobs
        if (job.status === "FETCHING_RESULTS") {
          const staleMs = Date.now() - new Date(job.updatedAt).getTime();
          const timeoutMs = 10 * 60 * 1000; // 10 minutes

          if (staleMs > timeoutMs) {
            console.error(`[ACTIVE POLLING] Job ${job.id} stuck in FETCHING_RESULTS for 10min. Marking as FAILED.`);
            const failedJob = await prisma.crawlJob.update({
              where: { id: job.id },
              data: {
                status: "FAILED",
                error: "Timeout: Failed to download results from Cloudflare after 10 minutes.",
              },
            });
            return failedJob;
          }

          // If no progress in 30s, re-trigger QStash as recovery
          if (staleMs > 30 * 1000) {
            try {
              const { scheduleCrawlSync } = await import("@/lib/qstash");
              await scheduleCrawlSync({ jobId: job.id, action: "FETCH_CHUNK", cursor: null }, 0);
              console.log(`[ACTIVE POLLING] Re-triggered QStash for stale job ${job.id}`);
            } catch (e) {
              console.error(`[ACTIVE POLLING] Failed to re-trigger QStash for ${job.id}:`, e);
            }
          }
          return job;
        }

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
