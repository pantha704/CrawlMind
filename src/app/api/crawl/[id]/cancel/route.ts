import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

// Mark a stuck RUNNING/QUEUED job as FAILED
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const job = await prisma.crawlJob.findUnique({
      where: { id },
    });

    if (!job || job.userId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (job.status !== "RUNNING" && job.status !== "QUEUED") {
      return NextResponse.json(
        { error: "Job is not in a cancellable state" },
        { status: 400 }
      );
    }

    const updated = await prisma.crawlJob.update({
      where: { id },
      data: {
        status: "FAILED",
        completedAt: new Date(),
      },
    });

    return NextResponse.json({ job: updated });
  } catch (err) {
    console.error("Cancel job error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
