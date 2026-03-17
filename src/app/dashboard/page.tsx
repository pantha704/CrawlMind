"use client";

import { useState } from "react";
import { CrawlInput } from "@/components/dashboard/crawl-input";
import { ActiveJobs } from "@/components/dashboard/active-jobs";
import { RecentCrawls } from "@/components/dashboard/recent-crawls";

export default function DashboardPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Crawl Input */}
      <CrawlInput onCrawlStarted={() => setRefreshKey((k) => k + 1)} />

      {/* Active Jobs */}
      <ActiveJobs key={`active-${refreshKey}`} />

      {/* Recent Crawls */}
      <RecentCrawls key={`recent-${refreshKey}`} />
    </div>
  );
}
