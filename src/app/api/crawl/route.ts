import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startCrawlJob, type CrawlConfig } from "@/lib/cloudflare";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getTierLimits } from "@/config/plans";

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    const body = await req.json();
    const { query, inputType, depth, format, render, includeSubdomains, includeExternalLinks } = body;
    let limit = body.limit;

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    // Fetch user plan and current usage
    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { plan: true },
    });
    
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const crawlsToday = await prisma.crawlJob.count({
      where: {
        userId: session.user.id,
        createdAt: { gte: startOfToday },
      },
    });

    const { maxCrawls, maxPages, allowAI, allowJS } = getTierLimits(dbUser?.plan || "SPARK");
    const userPlan = dbUser?.plan || "SPARK";

    if (crawlsToday >= maxCrawls) {
      return NextResponse.json(
        { error: `Daily limit reached for ${userPlan} plan` },
        { status: 403 }
      );
    }

    if (inputType === "PLAINTEXT" && !allowAI) {
      return NextResponse.json(
        { error: "AI URL discovery requires PRO plan or higher" },
        { status: 403 }
      );
    }

    if (render && !allowJS) {
      return NextResponse.json(
        { error: "JS rendering requires PRO plan or higher" },
        { status: 403 }
      );
    }

    // Enforce max pages limit quietly
    if (!limit || limit > maxPages) {
      limit = maxPages;
    }

    // Resolve URLs
    let urls: string[] = [];
    if (inputType === "URL") {
      // Parse URLs from input (comma or newline separated)
      urls = query
        .split(/[\n,]+/)
        .map((u: string) => u.trim())
        .filter((u: string) => u.startsWith("http"));

      if (urls.length === 0) {
        // Try adding https:// prefix
        urls = query
          .split(/[\n,]+/)
          .map((u: string) => u.trim())
          .filter(Boolean)
          .map((u: string) => (u.startsWith("http") ? u : `https://${u}`));
      }
    } else {
      // AI URL Discovery - call AI to resolve natural language to URLs
      try {
        const { generateText } = await import("ai");
        const { fastModel } = await import("@/lib/ai");
        const { text } = await generateText({
          model: fastModel,
          prompt: `You are a URL resolver. Given this query, return 1-5 relevant URLs that would contain the information requested. Return ONLY the URLs, one per line, nothing else.\n\nQuery: ${query}`,
        });
        if (text) {
          const rawUrls = text.split("\n").map((u: string) => u.trim()).filter(Boolean);
          urls = rawUrls.filter((u: string) => u.startsWith("http"));
        }
      } catch {
        return NextResponse.json(
          { error: "AI URL discovery failed. Please try URL mode." },
          { status: 500 }
        );
      }
    }

    if (urls.length === 0) {
      return NextResponse.json(
        { error: "No valid URLs found. Please enter a valid URL." },
        { status: 400 }
      );
    }

    // Generate include patterns to tell Cloudflare to not skip sub-links
    let includePatterns: string[] | undefined;
    try {
      const urlObj = new URL(urls[0]);
      // If user wants subdomains, we wildcard the subdomain part too
      if (includeSubdomains) {
        // e.g. "https://*.example.com/**"
        const domain = urlObj.hostname.replace(/^www\./, "");
        includePatterns = [`https://*.${domain}/**`, `http://*.${domain}/**`, `https://${domain}/**`, `http://${domain}/**`];
      } else {
        // Just the exact origin
        includePatterns = [`${urlObj.origin}/**`];
      }
    } catch {
      // In case of invalid URL fallback
    }

    // Start crawl via Cloudflare
    const crawlOpts: CrawlConfig = {
      url: urls[0],
      source: body.source || "all",
      maxURLs: limit || 100,
      depth: depth || 2,
      formats: [format || "markdown"],
      render: render || false,
      ...(body.maxAge !== undefined && { maxAge: body.maxAge }),
      ...(body.modifiedSince && { modifiedSince: body.modifiedSince }),
      options: {
        includeSubdomains: includeSubdomains ?? true,
        includeExternalLinks: includeExternalLinks ?? false,
        ...(includePatterns && { includePatterns }),
        ...(body.excludePatterns && { excludePatterns: body.excludePatterns }),
      },
    };

    const cfResponse = await startCrawlJob(crawlOpts);
    console.log("[CRAWL] Cloudflare response:", JSON.stringify(cfResponse));

    if (!cfResponse.success || !cfResponse.jobId) {
      console.error("[CRAWL] Cloudflare crawl failed to start:", cfResponse.error);
      return NextResponse.json(
        { error: cfResponse.error || "Failed to start crawl — Cloudflare returned no job ID" },
        { status: 502 }
      );
    }

    // Store job in DB
    const job = await prisma.crawlJob.create({
      data: {
        userId,
        cfJobId: cfResponse.jobId,
        cfAccountId: cfResponse.accountId,
        inputType: inputType || "URL",
        query,
        resolvedUrls: urls,
        status: "RUNNING",
        config: crawlOpts as object,
        format: format || "markdown",
        pagesCrawled: 0,
      },
    });

    console.log("[CRAWL] Job created:", job.id, "cfJobId:", cfResponse.jobId);

    // AI Topic Classification (Optional background task)
    let topicCategory = "General";
    try {
      const { generateText } = await import("ai");
      const { fastModel } = await import("@/lib/ai");
      const { text: category } = await generateText({
        model: fastModel,
        prompt: `Classify this search query into one of these categories: Technology, Business, Research, Finance, News, Shopping, Other. Return only the category name.\n\nQuery: ${query}`,
      });
      if (category) topicCategory = category.trim();
    } catch (e) {
      console.error("Classification failed:", e);
    }

    // Log search event
    await prisma.searchEvent.create({
      data: {
        userId,
        queryText: query,
        queryType: inputType === "PLAINTEXT" ? "PLAINTEXT" : "URL",
        topicCategory,
        createdAt: new Date(),
      },
    });

    // Schedule QStash background sync (resilient — works even if user closes tab)
    try {
      const { scheduleCrawlSync } = await import("@/lib/qstash");
      await scheduleCrawlSync({ jobId: job.id, action: "SYNC" }, 30); // first check after 30s
    } catch (e) {
      console.error("QStash scheduling failed (non-critical):", e);
    }

    return NextResponse.json({
      success: true,
      jobId: job.id,
      cfJobId: job.cfJobId,
      urls,
    });
  } catch (err) {
    console.error("Crawl API error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
