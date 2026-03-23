import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

    const tierLimits = {
      SPARK: { label: "Spark Plan", maxCrawls: 5, maxPages: 100, allowAI: false, allowJS: false },
      PRO: { label: "Pro Plan", maxCrawls: 25, maxPages: 100, allowAI: true, allowJS: true },
      PRO_PLUS: { label: "Pro+ Plan", maxCrawls: 75, maxPages: 100, allowAI: true, allowJS: true },
      SCALE: { label: "Scale Plan", maxCrawls: 150, maxPages: 100, allowAI: true, allowJS: true },
    };

    const userPlan = (dbUser?.plan as keyof typeof tierLimits) || "SPARK";
    const limits = tierLimits[userPlan] || tierLimits.SPARK;

    const adminEmails = process.env.ADMIN_EMAILS?.split(",").map(e => e.trim().toLowerCase()) || [];
    const isAdmin = adminEmails.includes(session.user.email.toLowerCase());

    return NextResponse.json({
      plan: userPlan,
      planLabel: limits.label,
      crawlsToday,
      maxCrawls: limits.maxCrawls,
      maxPages: limits.maxPages,
      allowAI: limits.allowAI,
      allowJS: limits.allowJS,
      usagePercent: Math.min(100, (crawlsToday / limits.maxCrawls) * 100),
      isAdmin,
    });
  } catch (error) {
    console.error("Usage API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
