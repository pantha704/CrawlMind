import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check admin gate
    const adminEmails = process.env.ADMIN_EMAILS?.split(",").map(e => e.trim().toLowerCase()) || [];
    if (!adminEmails.includes(session.user.email.toLowerCase())) {
      return NextResponse.json({ error: "Forbidden: Admins only" }, { status: 403 });
    }

    // 1. Overview Aggregates
    const [totalUsers, totalCrawls] = await Promise.all([
      prisma.user.count(),
      prisma.crawlJob.count(),
    ]);

    // Subscribed vs Free users
    const subscribedUsers = await prisma.user.count({
      where: { plan: { not: "SPARK" } },
    });
    const freeUsers = totalUsers - subscribedUsers;

    // Total pages + Imported jobs
    const allJobs = await prisma.crawlJob.findMany({
      select: { pagesCrawled: true, isImported: true },
    });
    const totalPagesFetched = allJobs.reduce((acc, job) => acc + (job.pagesCrawled || 0), 0);
    const totalImportedJobs = allJobs.filter(j => j.isImported).length;

    const overview = {
      totalUsers,
      subscribedUsers,
      freeUsers,
      totalCrawls,
      totalPagesFetched,
      totalImportedJobs,
    };

    // 2. Plan Distribution
    const planGroups = await prisma.user.groupBy({
      by: ["plan"],
      _count: { id: true },
    });
    const planDistribution = planGroups.map(p => ({
      name: p.plan, // recharts expects 'name' and 'value' for PieChart
      value: p._count.id,
    }));

    // 3. Status Distribution
    const statusGroups = await prisma.crawlJob.groupBy({
      by: ["status"],
      _count: { id: true },
    });
    const statusDistribution = statusGroups.map(s => ({
      name: s.status,
      count: s._count.id,
    }));

    // 4. Daily Usage (last 30 days)
    // We fetch users and jobs and group them by date manually across DB to avoid complex raw SQL for Prisma cross-table dates.
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentJobs = await prisma.crawlJob.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true, pagesCrawled: true },
    });
    const recentUsers = await prisma.user.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true },
    });

    const dailyUsageMap = new Map<string, { date: string; crawls: number; pages: number; newUsers: number }>();
    
    // Initialize map for the last 30 days
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStr = d.toISOString().split("T")[0];
      dailyUsageMap.set(dayStr, { date: dayStr, crawls: 0, pages: 0, newUsers: 0 });
    }

    recentJobs.forEach(j => {
      const dayStr = j.createdAt.toISOString().split("T")[0];
      if (dailyUsageMap.has(dayStr)) {
        const item = dailyUsageMap.get(dayStr)!;
        item.crawls += 1;
        item.pages += j.pagesCrawled || 0;
      }
    });

    recentUsers.forEach(u => {
      const dayStr = u.createdAt.toISOString().split("T")[0];
      if (dailyUsageMap.has(dayStr)) {
        const item = dailyUsageMap.get(dayStr)!;
        item.newUsers += 1;
      }
    });

    const dailyUsage = Array.from(dailyUsageMap.values());

    // 5. Top Users
    const usersWithCrawls = await prisma.user.findMany({
      include: {
        _count: { select: { crawlJobs: true } },
        crawlJobs: { select: { pagesCrawled: true } },
      },
    });

    const topUsers = usersWithCrawls
      .map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        image: u.image,
        plan: u.plan,
        crawlCount: u._count.crawlJobs,
        totalPages: u.crawlJobs.reduce((acc, job) => acc + (job.pagesCrawled || 0), 0),
        createdAt: u.createdAt,
      }))
      .sort((a, b) => b.crawlCount - a.crawlCount)
      .slice(0, 50); // Top 50 users

    // 6. Recent Crawls (Global)
    const recentGlobalCrawls = await prisma.crawlJob.findMany({
      take: 20,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { name: true, email: true, image: true } } },
    });

    return NextResponse.json({
      overview,
      planDistribution,
      statusDistribution,
      dailyUsage,
      topUsers,
      recentCrawls: recentGlobalCrawls.map(c => ({
        id: c.id,
        query: c.query,
        status: c.status,
        pagesCrawled: c.pagesCrawled,
        isImported: c.isImported,
        user: c.user,
        createdAt: c.createdAt,
      })),
    });

  } catch (error: unknown) {
    console.error("Admin Stats API Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch admin stats" },
      { status: 500 }
    );
  }
}
