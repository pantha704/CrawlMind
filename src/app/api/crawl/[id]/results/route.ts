import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

/**
 * GET /api/crawl/[id]/results
 * 
 * Streaming proxy: pipes Cloudflare's slow crawl result endpoint
 * directly to the browser. Bypasses Vercel's 10s serverless timeout
 * because we use a streaming response (no body buffering).
 * 
 * Once results are received and parsed, also saves them to the DB
 * so future loads are instant (from DB rather than CF).
 */
export const maxDuration = 60; // Vercel Pro: allow up to 60s

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

    const job = await prisma.crawlJob.findUnique({
      where: { id },
      select: { id: true, cfJobId: true, cfAccountId: true, status: true, userId: true, resultData: true },
    });

    if (!job || job.userId !== session.user.id) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // If we already have saved results, return them instantly from DB
    if (job.resultData && Array.isArray(job.resultData) && (job.resultData as unknown[]).length > 0) {
      return NextResponse.json({ success: true, records: job.resultData, source: "db" });
    }

    if (!job.cfJobId || job.cfJobId === "pending") {
      return NextResponse.json({ error: "No Cloudflare job ID" }, { status: 400 });
    }

    // Find the token for this account
    const credsStr = process.env.CLOUDFLARE_CREDENTIALS;
    const creds = credsStr
      ? credsStr.split(",").map((pair) => {
          const [accountId, apiToken] = pair.split(":");
          return { accountId: accountId?.trim(), apiToken: apiToken?.trim() };
        })
      : [];

    const fallbackToken = process.env.CLOUDFLARE_API_TOKEN;
    const fallbackAccount = process.env.CLOUDFLARE_ACCOUNT_ID;

    const matchedCred = creds.find((c) => c.accountId === job.cfAccountId) ||
      (fallbackAccount === job.cfAccountId ? { accountId: fallbackAccount, apiToken: fallbackToken } : null) ||
      creds[0];  // last resort: first available

    if (!matchedCred?.apiToken || !matchedCred?.accountId) {
      return NextResponse.json({ error: "Missing CF credentials" }, { status: 500 });
    }

    const cfUrl = `https://api.cloudflare.com/client/v4/accounts/${matchedCred.accountId}/browser-rendering/crawl/${job.cfJobId}`;

    console.log(`[results-proxy] Forwarding to CF: ${cfUrl}`);

    // Fetch from Cloudflare — stream response body directly
    const cfRes = await fetch(cfUrl, {
      headers: { Authorization: `Bearer ${matchedCred.apiToken}` },
    });

    if (!cfRes.ok || !cfRes.body) {
      const errText = await cfRes.text().catch(() => "");
      console.error(`[results-proxy] CF error ${cfRes.status}:`, errText.slice(0, 300));
      return NextResponse.json({ error: `Cloudflare error ${cfRes.status}` }, { status: 502 });
    }

    // Collect the streamed body, then parse and persist
    const rawText = await cfRes.text();

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      return NextResponse.json({ error: "Invalid JSON from Cloudflare" }, { status: 502 });
    }

    if (!parsed.success) {
      return NextResponse.json({ error: "Cloudflare said not success", details: parsed.errors }, { status: 502 });
    }

    const records = (parsed.result as Record<string, unknown>)?.records as unknown[];
    const completedPages = Array.isArray(records)
      ? records.filter((p: unknown) => (p as Record<string, unknown>).status === "completed").length
      : 0;

    // Save to DB for future instant loads
    if (Array.isArray(records)) {
      await prisma.crawlJob.update({
        where: { id: job.id },
        data: {
          status: "COMPLETED",
          resultData: records as object,
          pagesCrawled: completedPages,
          completedAt: new Date(),
        },
      });
      console.log(`[results-proxy] Saved ${records.length} records (${completedPages} completed) for job ${job.id}`);
    }

    return NextResponse.json({
      success: true,
      records,
      pagesCrawled: completedPages,
      source: "cloudflare",
    });
  } catch (err) {
    console.error("[results-proxy] Error:", err);
    return NextResponse.json({ error: "Failed to fetch results" }, { status: 500 });
  }
}
