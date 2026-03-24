import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getCrawlStatus, getAllCrawlResults } from "@/lib/cloudflare";

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

    const updatedJobs = await Promise.all(
      activeJobs.map(async (job) => {
        if (!job.cfJobId || job.cfJobId === "pending") return job;

        // If FETCHING_RESULTS, results are being fetched inline by another request.
        // If stuck > 10 min, mark as failed.
        if (job.status === "FETCHING_RESULTS") {
          const staleMs = Date.now() - new Date(job.updatedAt).getTime();
          if (staleMs > 10 * 60 * 1000) {
            return prisma.crawlJob.update({
              where: { id: job.id },
              data: {
                status: "FAILED",
                error: "Timeout: Failed to download results after 10 minutes.",
              },
            });
          }
          return job; // Another request is handling it
        }

        try {
          const cfStatus = await getCrawlStatus(job.cfJobId, job.cfAccountId);

          if (!cfStatus.success) {
            if (cfStatus.status === "failed") {
              return prisma.crawlJob.update({
                where: { id: job.id },
                data: { status: "FAILED", error: cfStatus.error || "Cloudflare crawl failed" },
              });
            }
            return job;
          }

          if (cfStatus.status === "completed") {
            // Mark as fetching first (prevents other polling requests from double-fetching)
            await prisma.crawlJob.update({
              where: { id: job.id },
              data: { status: "FETCHING_RESULTS" },
            });

            // Fetch all results inline
            const results = await getAllCrawlResults(job.cfJobId, job.cfAccountId);

            if (results.success && results.records.length > 0) {
              return prisma.crawlJob.update({
                where: { id: job.id },
                data: {
                  status: "COMPLETED",
                  resultData: results.records as object,
                  pagesCrawled: results.records.length,
                  completedAt: new Date(),
                },
              });
            } else {
              return prisma.crawlJob.update({
                where: { id: job.id },
                data: {
                  status: results.records.length > 0 ? "PARTIAL" : "FAILED",
                  resultData: results.records.length > 0 ? (results.records as object) : undefined,
                  pagesCrawled: results.records.length,
                  error: results.error || "No results returned from Cloudflare",
                  completedAt: new Date(),
                },
              });
            }
          }

          if (cfStatus.status === "failed") {
            return prisma.crawlJob.update({
              where: { id: job.id },
              data: { status: "FAILED", error: "Cloudflare crawl failed" },
            });
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
