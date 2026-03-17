import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AnalyticsClient } from "./analytics-client";

export default async function AnalyticsPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/signin");
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { plan: true },
  });

  if (!dbUser) {
    redirect("/signin");
  }

  // Generate last 30 days data
  const data: { date: string; crawls: number; pages: number }[] = [];
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  thirtyDaysAgo.setHours(0, 0, 0, 0);

  if (dbUser.plan !== "SPARK") {
    // Fetch aggregated data
    const jobs = await prisma.crawlJob.findMany({
      where: {
        userId: session.user.id,
        createdAt: { gte: thirtyDaysAgo },
      },
      select: {
        createdAt: true,
        pagesCrawled: true,
      },
    });

    // Group by date string (YYYY-MM-DD)
    const grouped = jobs.reduce((acc, job) => {
      const dateStr = job.createdAt.toISOString().split("T")[0];
      if (!acc[dateStr]) {
        acc[dateStr] = { crawls: 0, pages: 0 };
      }
      acc[dateStr].crawls += 1;
      acc[dateStr].pages += job.pagesCrawled;
      return acc;
    }, {} as Record<string, { crawls: number; pages: number }>);

    // Fill in missing days
    for (let i = 0; i < 30; i++) {
      const d = new Date(thirtyDaysAgo);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split("T")[0];
      data.push({
        date: dateStr,
        crawls: grouped[dateStr]?.crawls || 0,
        pages: grouped[dateStr]?.pages || 0,
      });
    }
  }

  return (
    <div className="max-w-6xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground">
          Track your data extraction volume and usage trends.
        </p>
      </div>

      <AnalyticsClient data={data} plan={dbUser.plan} />
    </div>
  );
}
