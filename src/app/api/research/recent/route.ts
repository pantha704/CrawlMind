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

    const researchJobs = await prisma.researchJob.findMany({
      where: {
        userId: session.user.id,
        status: { in: ["COMPLETED", "FAILED", "SYNTHESIZED"] },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        _count: { select: { subJobs: true } },
        subJobs: {
          select: {
            status: true,
            pagesCrawled: true,
          },
        },
      },
    });

    const jobs = researchJobs.map((job) => ({
      id: job.id,
      query: job.query,
      status: job.status,
      depthLevel: job.depthLevel,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
      totalSources: job._count.subJobs,
      totalPages: job.subJobs.reduce((sum, s) => sum + (s.pagesCrawled || 0), 0),
      hasSynthesis: !!job.synthesis,
    }));

    return NextResponse.json({ researchJobs: jobs });
  } catch (err) {
    console.error("Recent research error:", err);
    return NextResponse.json({ researchJobs: [] });
  }
}
