import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    // Validate envelope
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON format" }, { status: 400 });
    }

    let jobMeta;
    let records;

    if (body._type === "crawlmind_export_v1" && body.job) {
      // New enveloped format
      jobMeta = body.job;
      records = body.records;
    } else if (Array.isArray(body)) {
      // Old legacy format (just an array of records)
      records = body;
      jobMeta = {
        query: records[0]?.url || "Imported Legacy Data",
        inputType: "URL",
        resolvedUrls: records[0]?.url ? [records[0].url] : [],
        status: "COMPLETED",
        config: { imported: true, legacy: true },
        pagesCrawled: records.filter((r: Record<string, unknown>) => r.status === "completed").length,
        format: "json", // Best guess
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      };
    } else {
      return NextResponse.json({ error: "Unrecognized import format. Expected Crawlmind export JSON." }, { status: 400 });
    }

    // Create the reconstructed job
    const newJob = await prisma.crawlJob.create({
      data: {
        userId: session.user.id,
        query: jobMeta.query || "Imported Crawl",
        inputType: jobMeta.inputType || "URL",
        resolvedUrls: jobMeta.resolvedUrls || [],
        status: "COMPLETED", // Automatically completed
        config: jobMeta.config || { imported: true },
        resultData: records as object,
        pagesCrawled: jobMeta.pagesCrawled || 0,
        format: jobMeta.format || "json",
        error: jobMeta.error || null,
        isImported: true, // Flag it as imported
        createdAt: jobMeta.createdAt ? new Date(jobMeta.createdAt) : new Date(),
        completedAt: jobMeta.completedAt ? new Date(jobMeta.completedAt) : new Date(),
      },
    });

    return NextResponse.json({ success: true, jobId: newJob.id });
  } catch (error: unknown) {
    console.error("[IMPORT CRAWL] Failed:", error);
    const errMessage = error instanceof Error ? error.message : "Failed to process imported crawl file";
    return NextResponse.json(
      { error: errMessage },
      { status: 500 }
    );
  }
}
