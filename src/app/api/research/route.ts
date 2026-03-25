import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { startCrawlJob, type CrawlConfig } from "@/lib/cloudflare";
import { discoverUrls, fetchSourceContent, estimateUsage, DEPTH_TIERS, type DepthLevel } from "@/lib/research";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await req.json();
    const { query, depth = "QUICK", aiDiscovery = false, sourceUrl } = body;

    if (!query && !sourceUrl) {
      return NextResponse.json({ error: "Query or source URL is required" }, { status: 400 });
    }

    const depthLevel = (depth as string).toUpperCase() as DepthLevel;
    if (!DEPTH_TIERS[depthLevel]) {
      return NextResponse.json({ error: "Invalid depth level" }, { status: 400 });
    }

    const tier = DEPTH_TIERS[depthLevel];

    // If user provided a URL, pre-fetch it so Groq gets real context
    let sourceContent = "";
    if (sourceUrl) {
      console.log(`[research] Pre-fetching source URL for context: ${sourceUrl}`);
      sourceContent = await fetchSourceContent(sourceUrl);
      console.log(`[research] Got ${sourceContent.length} chars of context from source`);
    }

    // Build the research query
    const researchQuery = sourceUrl && aiDiscovery
      ? `Find sites related to ${sourceUrl} — ${query || "comprehensive research"}`
      : query;

    // Step 1: AI discovers URLs via Groq (now with source context when available)
    const { urls: discovered, error: discoverError } = await discoverUrls(
      researchQuery,
      depthLevel,
      [],
      sourceContent || undefined
    );

    if (discovered.length === 0) {
      return NextResponse.json(
        { error: discoverError || "AI could not find relevant URLs for this query" },
        { status: 422 }
      );
    }

    // If source URL was provided, include it in the crawl list
    const allUrls = sourceUrl
      ? [{ url: sourceUrl, reason: "User-provided seed URL", category: "official" }, ...discovered]
      : discovered;

    // Estimate usage
    const usage = estimateUsage(depthLevel);

    // Step 2: Create ResearchJob
    const researchJob = await prisma.researchJob.create({
      data: {
        userId,
        query: researchQuery,
        depthLevel,
        status: "CRAWLING",
        sourceStrategy: [...new Set(allUrls.map(u => u.category))],
        discoveredUrls: allUrls.map(u => u.url),
        estimatedPages: usage.pages,
        round: 1,
        maxRounds: tier.maxRounds,
        config: {
          originalQuery: query,
          sourceUrl,
          aiDiscovery,
          discovered: allUrls,
        },
      },
    });

    // Step 3: Create CrawlJob children (fire CF crawls in parallel)
    const subJobPromises = allUrls.map(async (discovered) => {
      const urlObj = (() => { try { return new URL(discovered.url); } catch { return null; } })();
      if (!urlObj) return null;

      const domain = urlObj.hostname.replace(/^www\./, "");
      const crawlConfig: CrawlConfig = {
        url: discovered.url,
        source: "all",
        limit: depthLevel === "RESEARCH" ? 50 : 20,
        depth: 2,
        formats: ["markdown"],
        render: false,
        options: {
          includeSubdomains: true,
          includeExternalLinks: false,
          includePatterns: [`https://*.${domain}/**`, `https://${domain}/**`],
        },
      };

      const cfResult = await startCrawlJob(crawlConfig);
      if (!cfResult.success || !cfResult.jobId) {
        console.error(`[research] Failed to start crawl for ${discovered.url}:`, cfResult.error);
        return null;
      }

      return prisma.crawlJob.create({
        data: {
          userId,
          cfJobId: cfResult.jobId,
          cfAccountId: cfResult.accountId,
          inputType: "URL",
          query: discovered.url,
          resolvedUrls: [discovered.url],
          status: "RUNNING",
          config: crawlConfig as object,
          format: "markdown",
          researchJobId: researchJob.id,
        },
      });
    });

    const subJobs = (await Promise.all(subJobPromises)).filter(Boolean);

    console.log(`[research] Created research job ${researchJob.id} with ${subJobs.length} sub-crawls (${depthLevel})`);

    return NextResponse.json({
      success: true,
      researchJobId: researchJob.id,
      subJobCount: subJobs.length,
      discoveredUrls: allUrls,
      estimate: usage,
    });
  } catch (err) {
    console.error("[research] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
