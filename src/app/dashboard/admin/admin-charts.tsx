"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

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

export default function AdminCharts({
  dailyUsage,
  planDistribution,
  verificationDistribution,
}: AdminChartsProps) {
  return (
    <div className="grid gap-4 grid-cols-1 lg:grid-cols-4">
      {/* Line Chart — spans 3 cols on large screens to align with top stats */}
      <Card className="lg:col-span-3">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Usage Over Last 30 Days</CardTitle>
        </CardHeader>
        <CardContent className="pl-2 pr-4">
          <div style={{ width: "100%", height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={dailyUsage}
                margin={{ top: 5, right: 10, bottom: 5, left: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="hsl(var(--border))"
                />
                <XAxis
                  dataKey="date"
                  tickFormatter={(val) =>
                    new Date(val).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })
                  }
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  yAxisId="left"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${value}`}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${value}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)",
                  }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                  itemStyle={{ color: "hsl(var(--foreground))" }}
                />
                <Legend
                  verticalAlign="bottom"
                  height={28}
                  iconSize={10}
                  wrapperStyle={{ fontSize: 12 }}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="crawls"
                  stroke="#00C49F"
                  name="New Crawls"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="pages"
                  stroke="#0088FE"
                  name="Pages Fetched"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Right column — two pie charts stacked */}
      <div className="flex flex-col gap-4 lg:col-span-1">
        <Card className="flex-1">
          <CardHeader className="pb-0">
            <CardTitle className="text-base">Plan Distribution</CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div style={{ width: "100%", height: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={planDistribution}
                    cx="40%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {planDistribution.map((_entry, index) => (
                      <Cell
                        key={`plan-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "var(--radius)",
                    }}
                  />
                  <Legend
                    layout="vertical"
                    align="right"
                    verticalAlign="middle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="flex-1">
          <CardHeader className="pb-0">
            <CardTitle className="text-base">User Verification</CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div style={{ width: "100%", height: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={verificationDistribution}
                    cx="40%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {verificationDistribution.map((_entry, index) => (
                      <Cell
                        key={`verify-${index}`}
                        fill={["#00C49F", "#FF8042"][index % 2]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "var(--radius)",
                    }}
                  />
                  <Legend
                    layout="vertical"
                    align="right"
                    verticalAlign="middle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
