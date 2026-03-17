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
        status: { in: ["QUEUED", "RUNNING"] },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    // Check Cloudflare for updates for each active job
    const updatedJobs = await Promise.all(
      activeJobs.map(async (job) => {
        if (!job.cfJobId || job.cfJobId === "pending") return job;

        try {
          const cfStatus = await getCrawlStatus(job.cfJobId);
          
          if (cfStatus.success) {
            let newStatus = job.status;
            if (cfStatus.status === "completed") newStatus = "COMPLETED";
            if (cfStatus.status === "failed") newStatus = "FAILED";

            // Extract pages crawled if available (Cloudflare usually depth/limit focused)
            // We can estimate or use metadata if Cloudflare provides it
            const resultData = cfStatus.data as any;
            let pagesCount = job.pagesCrawled;

            if (Array.isArray(resultData)) {
              pagesCount = resultData.filter((p: any) => p.status === "completed").length;
            } else if (resultData?.pages_crawled) {
              pagesCount = resultData.pages_crawled;
            } else if (resultData?.total_pages) {
              pagesCount = resultData.total_pages;
            }

            if (newStatus !== job.status || pagesCount !== job.pagesCrawled) {
              return await prisma.crawlJob.update({
                where: { id: job.id },
                data: {
                  status: newStatus as any,
                  pagesCrawled: pagesCount,
                  resultData: cfStatus.status === "completed" ? resultData : job.resultData,
                  completedAt: cfStatus.status === "completed" ? new Date() : null,
                },
              });
            }
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
