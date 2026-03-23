"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Label,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";

import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface ChartDataEntry {
  name: string;
  value: number;
}

interface DailyUsageEntry {
  date: string;
  crawls: number;
  pages: number;
}

interface AdminChartsProps {
  dailyUsage: DailyUsageEntry[];
  planDistribution: ChartDataEntry[];
  verificationDistribution: ChartDataEntry[];
}

/* ------------------------------------------------------------------ */
/*  Chart configs (shadcn pattern — defines colors + labels)          */
/* ------------------------------------------------------------------ */

const usageConfig: ChartConfig = {
  crawls: {
    label: "Crawls",
    color: "var(--chart-1)",
  },
  pages: {
    label: "Pages Fetched",
    color: "var(--chart-2)",
  },
};

const PLAN_COLORS: Record<string, string> = {
  SPARK: "var(--chart-1)",
  PRO: "var(--chart-2)",
  PRO_PLUS: "var(--chart-3)",
  SCALE: "var(--chart-4)",
};

const VERIFICATION_COLORS: Record<string, string> = {
  Verified: "var(--chart-2)",
  Unverified: "var(--chart-5)",
};

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export default function AdminCharts({
  dailyUsage,
  planDistribution,
  verificationDistribution,
}: AdminChartsProps) {
  // Build dynamic chart configs from data
  const planConfig: ChartConfig = Object.fromEntries(
    planDistribution.map((entry) => [
      entry.name,
      { label: entry.name, color: PLAN_COLORS[entry.name] ?? "var(--chart-4)" },
    ])
  );

  const verifyConfig: ChartConfig = Object.fromEntries(
    verificationDistribution.map((entry) => [
      entry.name,
      {
        label: entry.name,
        color: VERIFICATION_COLORS[entry.name] ?? "var(--chart-3)",
      },
    ])
  );

  const totalUsers = verificationDistribution.reduce((s, e) => s + e.value, 0);

  return (
    <div className="grid gap-4 grid-cols-1 lg:grid-cols-7">
      {/* ── Area Chart: Usage over 30 days ─────────────────────── */}
      <Card className="lg:col-span-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Usage Over Last 30 Days</CardTitle>
          <CardDescription>Daily crawls and pages fetched</CardDescription>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-0">
          <ChartContainer
            config={usageConfig}
            className="aspect-auto h-[280px] w-full"
          >
            <AreaChart
              accessibilityLayer
              data={dailyUsage}
              margin={{ top: 5, right: 10, bottom: 0, left: 0 }}
            >
              <defs>
                <linearGradient id="fillCrawls" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-crawls)"
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-crawls)"
                    stopOpacity={0.1}
                  />
                </linearGradient>
                <linearGradient id="fillPages" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-pages)"
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-pages)"
                    stopOpacity={0.1}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
                tickFormatter={(val) =>
                  new Date(val).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })
                }
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                width={32}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    labelFormatter={(val) =>
                      new Date(val).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    }
                    indicator="dot"
                  />
                }
              />
              <Area
                dataKey="pages"
                type="natural"
                fill="url(#fillPages)"
                stroke="var(--color-pages)"
                strokeWidth={2}
                stackId="a"
              />
              <Area
                dataKey="crawls"
                type="natural"
                fill="url(#fillCrawls)"
                stroke="var(--color-crawls)"
                strokeWidth={2}
                stackId="b"
              />
              <ChartLegend content={<ChartLegendContent />} />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* ── Right column: Plan Distribution + Verification ────── */}
      <div className="grid gap-4 lg:col-span-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-1">
        {/* Plan Distribution — Horizontal Bar */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Plan Distribution</CardTitle>
            <CardDescription>Users per subscription plan</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={planConfig}
              className="mx-auto aspect-square max-h-[220px]"
            >
              <BarChart
                accessibilityLayer
                data={planDistribution}
                layout="vertical"
                margin={{ left: 0 }}
              >
                <YAxis
                  dataKey="name"
                  type="category"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                />
                <XAxis dataKey="value" type="number" hide />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent hideLabel />}
                />
                <Bar
                  dataKey="value"
                  radius={5}
                  fill="var(--chart-1)"
                  barSize={28}
                >
                  {planDistribution.map((entry) => (
                    <rect
                      key={entry.name}
                      fill={PLAN_COLORS[entry.name] ?? "var(--chart-4)"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Verification — Donut with center label */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">User Verification</CardTitle>
            <CardDescription>Verified vs unverified accounts</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={verifyConfig}
              className="mx-auto aspect-square max-h-[220px]"
            >
              <PieChart>
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent hideLabel />}
                />
                <Pie
                  data={verificationDistribution}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={85}
                  strokeWidth={5}
                >
                  <Label
                    content={({ viewBox }) => {
                      if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                        return (
                          <text
                            x={viewBox.cx}
                            y={viewBox.cy}
                            textAnchor="middle"
                            dominantBaseline="middle"
                          >
                            <tspan
                              x={viewBox.cx}
                              y={viewBox.cy}
                              className="fill-foreground text-3xl font-bold"
                            >
                              {totalUsers.toLocaleString()}
                            </tspan>
                            <tspan
                              x={viewBox.cx}
                              y={(viewBox.cy || 0) + 24}
                              className="fill-muted-foreground text-sm"
                            >
                              Total Users
                            </tspan>
                          </text>
                        );
                      }
                    }}
                  />
                </Pie>
                <ChartLegend
                  content={<ChartLegendContent nameKey="name" />}
                  className="-translate-y-2 flex-wrap gap-2 [&>*]:basis-1/4 [&>*]:justify-center"
                />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
