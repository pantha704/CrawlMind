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
  Cell,
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
/*  Chart Configs                                                     */
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
  
  // Format Plan Data to inject standard `fill` colors recognized by Recharts/Shadcn
  const formattedPlanData = planDistribution.map((entry) => ({
    ...entry,
    fill: PLAN_COLORS[entry.name.toUpperCase()] || "var(--chart-4)",
  }));

  const planConfig = Object.fromEntries(
    formattedPlanData.map((entry) => [
      entry.name,
      { label: entry.name, color: entry.fill },
    ])
  ) satisfies ChartConfig;

  // Format Verification Data 
  const formattedVerificationData = verificationDistribution.map((entry) => ({
    ...entry,
    fill: VERIFICATION_COLORS[entry.name] || "var(--chart-3)",
  }));

  const verifyConfig = Object.fromEntries(
    formattedVerificationData.map((entry) => [
      entry.name,
      { label: entry.name, color: entry.fill },
    ])
  ) satisfies ChartConfig;

  const totalUsers = formattedVerificationData.reduce((s, e) => s + e.value, 0);

  // Safety: Ensure dates don't crash
  const formatDate = (val: string) => {
    try {
      const d = new Date(val);
      if (isNaN(d.getTime())) return val;
      return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    } catch {
      return val;
    }
  };

  const formatTooltipDate = (val: unknown) => {
    try {
      const dateStr = String(val);
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
    } catch {
      return String(val);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      
      {/* ── TOP ROW: Area Chart ─────────────────────── */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-xl">Usage Trends</CardTitle>
          <CardDescription>Daily crawls and pages fetched over the last 30 days</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={usageConfig}
            className="aspect-auto h-[300px] w-full"
          >
            <AreaChart
              accessibilityLayer
              data={dailyUsage}
              margin={{ top: 10, right: 10, bottom: 0, left: 0 }}
            >
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={12}
                minTickGap={32}
                tickFormatter={formatDate}
                className="text-xs text-muted-foreground font-medium"
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={12}
                tickFormatter={(val) => `${val}`}
                className="text-xs text-muted-foreground font-medium"
              />
              <ChartTooltip
                cursor={{ stroke: "var(--border)", strokeWidth: 1, strokeDasharray: "4 4" }}
                content={
                  <ChartTooltipContent
                    labelFormatter={formatTooltipDate}
                    indicator="dot"
                  />
                }
              />
              <Area
                dataKey="pages"
                type="monotone"
                fill="var(--color-pages)"
                fillOpacity={0.2}
                stroke="var(--color-pages)"
                strokeWidth={2}
                stackId="a"
                activeDot={{ r: 6 }}
              />
              <Area
                dataKey="crawls"
                type="monotone"
                fill="var(--color-crawls)"
                fillOpacity={0.2}
                stroke="var(--color-crawls)"
                strokeWidth={2}
                stackId="b"
                activeDot={{ r: 6 }}
              />
              <ChartLegend content={<ChartLegendContent />} />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* ── BOTTOM ROW: 2 Columns ─────────────────────── */}
      <div className="grid gap-6 md:grid-cols-2">
        
        {/* Plan Distribution — Vertical Bar */}
        <Card className="flex flex-col">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Subscriptions</CardTitle>
            <CardDescription>User distribution across available plans</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 pb-2">
            <ChartContainer
              config={planConfig}
              className="aspect-auto h-[250px] w-full"
            >
              <BarChart accessibilityLayer data={formattedPlanData} margin={{ top: 20 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                  className="font-medium text-xs text-muted-foreground uppercase tracking-wider"
                />
                <YAxis hide />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent hideLabel />}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={40}>
                  {formattedPlanData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Verification — Chunky Donut */}
        <Card className="flex flex-col">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Verification Status</CardTitle>
            <CardDescription>Verified versus unverified accounts</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 pb-2">
            <ChartContainer
              config={verifyConfig}
              className="mx-auto aspect-square max-h-[250px] pb-0"
            >
              <PieChart>
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent hideLabel />}
                />
                <Pie
                  data={formattedVerificationData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={70}
                  outerRadius={100}
                  strokeWidth={4}
                  paddingAngle={3}
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
                              className="fill-foreground text-3xl font-bold tracking-tight"
                            >
                              {totalUsers.toLocaleString()}
                            </tspan>
                            <tspan
                              x={viewBox.cx}
                              y={(viewBox.cy || 0) + 24}
                              className="fill-muted-foreground text-sm font-medium"
                            >
                              Total Users
                            </tspan>
                          </text>
                        );
                      }
                    }}
                  />
                  {formattedVerificationData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <ChartLegend
                  content={<ChartLegendContent nameKey="name" />}
                  className="-translate-y-2 flex-wrap gap-4 [&>*]:justify-center"
                />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
