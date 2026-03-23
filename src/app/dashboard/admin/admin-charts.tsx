"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
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

interface DailyUsageEntry {
  date: string;
  crawls: number;
  pages: number;
}

interface AdminChartsProps {
  dailyUsage: DailyUsageEntry[];
}

/* ------------------------------------------------------------------ */
/*  Chart Config                                                      */
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

/* ------------------------------------------------------------------ */
/*  Range Options                                                     */
/* ------------------------------------------------------------------ */

const RANGES = [
  { label: "7d", days: 7 },
  { label: "14d", days: 14 },
  { label: "30d", days: 30 },
] as const;

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export default function AdminCharts({ dailyUsage }: AdminChartsProps) {
  const [range, setRange] = useState<7 | 14 | 30>(30);

  const filteredData = useMemo(() => {
    if (!dailyUsage?.length) return [];
    return dailyUsage.slice(-range);
  }, [dailyUsage, range]);

  // Summary stats
  const stats = useMemo(() => {
    const totalCrawls = filteredData.reduce((s, d) => s + d.crawls, 0);
    const totalPages = filteredData.reduce((s, d) => s + d.pages, 0);
    const peak = filteredData.reduce(
      (best, d) => (d.crawls > best.crawls ? d : best),
      filteredData[0] ?? { date: "-", crawls: 0, pages: 0 }
    );

    const peakLabel = (() => {
      try {
        const d = new Date(peak.date);
        if (isNaN(d.getTime())) return peak.date;
        return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
      } catch {
        return peak.date;
      }
    })();

    return { totalCrawls, totalPages, peakLabel, peakCrawls: peak.crawls };
  }, [filteredData]);

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
    <Card className="overflow-hidden">
      {/* Header with range selector */}
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-2">
        <div>
          <CardTitle className="text-xl">Usage Trends</CardTitle>
          <CardDescription>
            Daily crawls and pages fetched — last {range} days
          </CardDescription>
        </div>
        <div className="flex items-center gap-1 rounded-lg border bg-muted/40 p-1">
          {RANGES.map((r) => (
            <button
              key={r.days}
              onClick={() => setRange(r.days)}
              className={`
                rounded-md px-3 py-1.5 text-xs font-medium transition-all
                ${range === r.days
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }
              `}
            >
              {r.label}
            </button>
          ))}
        </div>
      </CardHeader>

      {/* Summary stat pills */}
      <div className="flex flex-wrap gap-3 px-6 pb-4">
        <StatPill label="Total Crawls" value={stats.totalCrawls.toLocaleString()} />
        <StatPill label="Pages Fetched" value={stats.totalPages.toLocaleString()} />
        <StatPill
          label="Peak Day"
          value={`${stats.peakLabel} · ${stats.peakCrawls}`}
        />
      </div>

      {/* Chart */}
      <CardContent className="px-2 sm:px-6 pb-6">
        <ChartContainer
          config={usageConfig}
          className="aspect-auto h-[320px] w-full"
        >
          <AreaChart
            accessibilityLayer
            data={filteredData}
            margin={{ top: 12, right: 12, bottom: 0, left: 0 }}
          >
            {/* Gradient definitions */}
            <defs>
              <linearGradient id="gradCrawls" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-crawls)" stopOpacity={0.35} />
                <stop offset="95%" stopColor="var(--color-crawls)" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="gradPages" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-pages)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--color-pages)" stopOpacity={0.02} />
              </linearGradient>
            </defs>

            <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/40" />

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
              width={40}
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
              fill="url(#gradPages)"
              stroke="var(--color-pages)"
              strokeWidth={2.5}
              activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--background)" }}
            />
            <Area
              dataKey="crawls"
              type="monotone"
              fill="url(#gradCrawls)"
              stroke="var(--color-crawls)"
              strokeWidth={2.5}
              activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--background)" }}
            />

            <ChartLegend content={<ChartLegendContent />} />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Stat Pill                                                         */
/* ------------------------------------------------------------------ */

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-full border bg-muted/30 px-3.5 py-1.5 text-xs">
      <span className="text-muted-foreground font-medium">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  );
}
