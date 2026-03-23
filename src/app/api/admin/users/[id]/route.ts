import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> } // Await params in Next.js 15
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminEmails = process.env.ADMIN_EMAILS?.split(",").map(e => e.trim().toLowerCase()) || [];
    if (!adminEmails.includes(session.user.email.toLowerCase())) {
      return NextResponse.json({ error: "Forbidden: Admins only" }, { status: 403 });
    }

    const resolvedParams = await params;
    const userId = resolvedParams.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        crawlJobs: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Analytics for this user
    const totalCrawls = user.crawlJobs.length;
    const totalPages = user.crawlJobs.reduce((acc, job) => acc + (job.pagesCrawled || 0), 0);
    const importedCrawls = user.crawlJobs.filter(job => job.isImported).length;

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        plan: user.plan,
        createdAt: user.createdAt,
      },
      stats: {
        totalCrawls,
        totalPages,
        importedCrawls,
      },
      crawlJobs: user.crawlJobs.map(job => ({
        id: job.id,
        query: job.query,
        status: job.status,
        pagesCrawled: job.pagesCrawled,
        isImported: job.isImported,
        createdAt: job.createdAt,
      })),
    });
  } catch (error: unknown) {
    console.error("Admin User Stats Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch user stats" },
      { status: 500 }
    );
  }
}
