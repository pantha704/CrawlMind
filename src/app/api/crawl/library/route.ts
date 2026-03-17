import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

// Library = permanent record of ALL jobs, including deleted
export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    const crawls = await prisma.crawlJob.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        query: true,
        status: true,
        inputType: true,
        pagesCrawled: true,
        format: true,
        createdAt: true,
        completedAt: true,
        deletedAt: true,
      },
    });

    return NextResponse.json({ crawls });
  } catch (err) {
    console.error("Library error:", err);
    return NextResponse.json({ crawls: [] });
  }
}
