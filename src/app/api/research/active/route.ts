import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const jobs = await prisma.researchJob.findMany({
      where: {
        userId: session.user.id,
        status: { in: ["DISCOVERING", "CRAWLING", "SYNTHESIZING"] },
      },
      include: {
        subJobs: {
          select: {
            id: true,
            query: true,
            status: true,
            pagesCrawled: true,
          },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    const enriched = jobs.map((j) => ({
      ...j,
      totalPages: j.subJobs.reduce((s, sub) => s + sub.pagesCrawled, 0),
    }));

    return NextResponse.json({ jobs: enriched });
  } catch (err) {
    console.error("[research/active] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
