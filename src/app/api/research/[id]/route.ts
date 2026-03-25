import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { analyzeGaps, synthesizeResults } from "@/lib/research";
import { startCrawlJob, type CrawlConfig } from "@/lib/cloudflare";

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

    const research = await prisma.researchJob.findUnique({
      where: { id },
      include: {
        subJobs: {
          select: {
            id: true,
            query: true,
            status: true,
            pagesCrawled: true,
            resultData: true,
            cfJobId: true,
            createdAt: true,
            completedAt: true,
            error: true,
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!research || research.userId !== session.user.id) {
      return NextResponse.json({ error: "Research job not found" }, { status: 404 });
    }

    const totalSubs = research.subJobs.length;
    const completedSubs = research.subJobs.filter(j => j.status === "COMPLETED").length;
    const failedSubs = research.subJobs.filter(j => j.status === "FAILED").length;
    const allDone = totalSubs > 0 && (completedSubs + failedSubs) === totalSubs;

    // If all sub-jobs are done and we haven't synthesized yet
    if (allDone && research.status === "CRAWLING") {
      // Check if multi-hop is needed (Research tier, not at max rounds)
      if (research.depthLevel === "RESEARCH" && research.round < research.maxRounds) {
        // Run gap analysis
        const crawledContent = research.subJobs
          .filter(j => j.resultData && j.status === "COMPLETED")
          .flatMap(j => {
            const records = j.resultData as unknown[];
            return Array.isArray(records)
              ? records.map((r: unknown) => (r as Record<string, unknown>).markdown as string || "").filter(Boolean)
              : [];
          });

        const gapResult = await analyzeGaps(
          research.query,
          crawledContent,
          research.discoveredUrls
        );

        if (!gapResult.isComprehensive && gapResult.urls.length > 0) {
          // Create new sub-crawls for follow-up URLs
          const newUrls = gapResult.urls.slice(0, 10);
          const newSubJobs = await Promise.all(
            newUrls.map(async (u) => {
              const urlObj = (() => { try { return new URL(u.url); } catch { return null; } })();
              if (!urlObj) return null;

              const domain = urlObj.hostname.replace(/^www\./, "");
              const config: CrawlConfig = {
                url: u.url,
                source: "all",
                limit: 50,
                depth: 2,
                formats: ["markdown"],
                render: false,
                options: {
                  includeSubdomains: true,
                  includeExternalLinks: false,
                  includePatterns: [`https://*.${domain}/**`, `https://${domain}/**`],
                },
              };

              const cf = await startCrawlJob(config);
              if (!cf.success || !cf.jobId) return null;

              return prisma.crawlJob.create({
                data: {
                  userId: research.userId,
                  cfJobId: cf.jobId,
                  cfAccountId: cf.accountId,
                  inputType: "URL",
                  query: u.url,
                  resolvedUrls: [u.url],
                  status: "RUNNING",
                  config: config as object,
                  format: "markdown",
                  researchJobId: research.id,
                },
              });
            })
          );

          const created = newSubJobs.filter(Boolean);
          await prisma.researchJob.update({
            where: { id: research.id },
            data: {
              round: research.round + 1,
              discoveredUrls: [...research.discoveredUrls, ...newUrls.map(u => u.url)],
            },
          });

          console.log(`[research] Round ${research.round + 1} — ${created.length} follow-up crawls for ${research.id}`);

          // Re-fetch with new sub-jobs
          const updated = await prisma.researchJob.findUnique({
            where: { id },
            include: { subJobs: { select: { id: true, query: true, status: true, pagesCrawled: true, createdAt: true, completedAt: true, error: true }, orderBy: { createdAt: "asc" } } },
          });

          return NextResponse.json({ ...updated, totalPages: updated?.subJobs.reduce((s, j) => s + j.pagesCrawled, 0) });
        }
      }

      // All rounds done or no gaps — trigger synthesis
      await prisma.researchJob.update({
        where: { id: research.id },
        data: { status: "SYNTHESIZING" },
      });

      // Gather all completed results for synthesis
      const allResults = research.subJobs
        .filter(j => j.status === "COMPLETED" && j.resultData)
        .flatMap(j => {
          const records = j.resultData as unknown[];
          return Array.isArray(records)
            ? records
                .filter((r: unknown) => (r as Record<string, unknown>).status === "completed")
                .map((r: unknown) => ({
                  url: (r as Record<string, unknown>).url as string,
                  content: (r as Record<string, unknown>).markdown as string || "",
                  title: (r as Record<string, unknown>).title as string || "",
                }))
            : [];
        });

      const synthResult = await synthesizeResults(research.query, allResults);

      await prisma.researchJob.update({
        where: { id: research.id },
        data: {
          status: synthResult.error ? "FAILED" : "COMPLETED",
          synthesis: synthResult.synthesis || null,
          synthesisModel: synthResult.model,
          error: synthResult.error || null,
          completedAt: new Date(),
        },
      });

      // Re-fetch final state
      const final = await prisma.researchJob.findUnique({
        where: { id },
        include: { subJobs: { select: { id: true, query: true, status: true, pagesCrawled: true, createdAt: true, completedAt: true, error: true }, orderBy: { createdAt: "asc" } } },
      });

      return NextResponse.json({
        ...final,
        totalPages: final?.subJobs.reduce((s, j) => s + j.pagesCrawled, 0),
      });
    }

    // Not done yet — return current state
    return NextResponse.json({
      ...research,
      subJobs: research.subJobs.map(({ resultData: _resultData, ...rest }) => rest), // Don't send full results in poll
      totalPages: research.subJobs.reduce((s, j) => s + j.pagesCrawled, 0),
    });
  } catch (err) {
    console.error("[research] Poll error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
