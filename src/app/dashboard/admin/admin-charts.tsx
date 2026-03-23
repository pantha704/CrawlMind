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
    <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
      {/* Line Chart — spans 2 cols on large screens */}
      <div className="lg:col-span-2 rounded-lg border bg-card text-card-foreground shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4">Usage Over Last 30 Days</h3>
        <div style={{ width: "100%", height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={dailyUsage}
              margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#333"
              />
              <XAxis
                dataKey="date"
                tickFormatter={(val) =>
                  new Date(val).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })
                }
                stroke="#888888"
                fontSize={12}
              />
              <YAxis
                yAxisId="left"
                stroke="#888888"
                fontSize={12}
                tickFormatter={(value) => `${value}`}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#888888"
                fontSize={12}
                tickFormatter={(value) => `${value}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#111",
                  border: "1px solid #333",
                }}
                itemStyle={{ color: "#fff" }}
              />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="crawls"
                stroke="#00C49F"
                name="New Crawls"
                strokeWidth={2}
                dot={false}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="pages"
                stroke="#0088FE"
                name="Pages Fetched"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Right column — two pie charts stacked */}
      <div className="flex flex-col gap-4 lg:col-span-1">
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6 flex-1">
          <h3 className="text-lg font-semibold mb-2">Plan Distribution</h3>
          <div style={{ width: "100%", height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={planDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={65}
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
                    backgroundColor: "#111",
                    border: "1px solid #333",
                  }}
                />
                <Legend verticalAlign="bottom" height={24} iconSize={10} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6 flex-1">
          <h3 className="text-lg font-semibold mb-2">User Verification</h3>
          <div style={{ width: "100%", height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={verificationDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={65}
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
                    backgroundColor: "#111",
                    border: "1px solid #333",
                  }}
                />
                <Legend verticalAlign="bottom" height={24} iconSize={10} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
