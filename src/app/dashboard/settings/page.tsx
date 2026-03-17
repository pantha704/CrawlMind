import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SettingsManageSubscription } from "./subscription-button";

export default async function SettingsPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/signin");
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!dbUser) {
    redirect("/signin");
  }

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const crawlsToday = await prisma.crawlJob.count({
    where: {
      userId: session.user.id,
      createdAt: { gte: startOfToday },
    },
  });

  const crawlsThisMonth = await prisma.crawlJob.count({
    where: {
      userId: session.user.id,
      createdAt: { gte: startOfMonth },
    },
  });

  const planMap: Record<string, { name: string; maxCrawls: number }> = {
    SPARK: { name: "Spark (Free)", maxCrawls: 2 },
    PRO: { name: "Pro ($12/mo)", maxCrawls: 25 },
    SCALE: { name: "Scale ($39/mo)", maxCrawls: 150 },
  };

  const currentPlan = planMap[dbUser.plan] || planMap.SPARK;

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings, subscription, and view usage.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle>Profile Details</CardTitle>
            <CardDescription>Your personal information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Name</label>
              <p className="font-semibold">{session.user.name}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Email</label>
              <p className="font-semibold">{session.user.email}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle>Subscription</CardTitle>
            <CardDescription>Your current plan and billing</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Current Plan</label>
              <p className="font-semibold text-lg">{currentPlan.name}</p>
              {dbUser.plan === "SPARK" && (
                <p className="text-sm text-muted-foreground mt-1">
                  Upgrade to unlock AI URL discovery, JS rendering, and higher limits.
                </p>
              )}
            </div>
            
            <SettingsManageSubscription plan={dbUser.plan} />
          </CardContent>
        </Card>

        <Card className="md:col-span-2 bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle>Usage Limits</CardTitle>
            <CardDescription>Your API usage based on your current plan</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Daily Crawls</span>
                  <span className="text-sm text-muted-foreground">
                    {crawlsToday} / {currentPlan.maxCrawls}
                  </span>
                </div>
                <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                  <div
                    className={`h-full ${
                      crawlsToday >= currentPlan.maxCrawls ? "bg-red-500" : "bg-primary"
                    }`}
                    style={{
                      width: `${Math.min((crawlsToday / currentPlan.maxCrawls) * 100, 100)}%`,
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Monthly Crawls (Estimated)</span>
                  <span className="text-sm text-muted-foreground">
                    {crawlsThisMonth} / {currentPlan.maxCrawls * 30}
                  </span>
                </div>
                <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary/50"
                    style={{
                      width: `${Math.min((crawlsThisMonth / (currentPlan.maxCrawls * 30)) * 100, 100)}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
