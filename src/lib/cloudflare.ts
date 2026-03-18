const CF_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN!;
const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID!;
const CF_BASE_URL = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/browser-rendering`;

export interface CrawlConfig {
  url: string;
  source?: "all" | "sitemaps" | "links";
  limit?: number;
  depth?: number;
  formats?: ("html" | "markdown" | "json")[];
  render?: boolean;
  maxAge?: number;
  modifiedSince?: string;
  options?: {
    includePatterns?: string[];
    excludePatterns?: string[];
    includeSubdomains?: boolean;
    includeExternalLinks?: boolean;
  };
}

export interface CrawlStartResult {
  success: boolean;
  jobId: string | null;
  error?: string;
}

interface CrawlStatusResult {
  success: boolean;
  status: "running" | "completed" | "failed";
  data?: unknown;
  error?: string;
}

export async function startCrawlJob(config: CrawlConfig): Promise<CrawlStartResult> {
  const response = await fetch(`${CF_BASE_URL}/crawl`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${CF_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(config),
  });

  const data = await response.json();
  console.log("[CF] Start crawl response:", JSON.stringify(data, null, 2));

  if (!response.ok || !data.success) {
    console.error("[CF] Start crawl failed:", data);
    return {
      success: false,
      jobId: null,
      error: data.errors?.[0]?.message || "Failed to start crawl job",
    };
  }

  // Cloudflare may return the ID as `data.result` (string) or `data.result.id`
  const jobId =
    typeof data.result === "string"
      ? data.result
      : data.result?.id || data.result?.jobId || null;

  console.log("[CF] Extracted jobId:", jobId);

  return {
    success: true,
    jobId,
  };
}

export async function getCrawlStatus(jobId: string): Promise<CrawlStatusResult> {
  console.log("[CF] Checking status for jobId:", jobId);
  const response = await fetch(`${CF_BASE_URL}/crawl/${jobId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${CF_API_TOKEN}`,
      "Content-Type": "application/json",
    },
  });

  const data = await response.json();
  console.log("[CF] Status response:", JSON.stringify(data, null, 2));

  if (!response.ok || !data.success) {
    console.error("[CF] Status check failed:", data);
    return {
      success: false,
      status: "failed",
      error: data.errors?.[0]?.message || "Failed to get crawl status",
    };
  }

  const result = data.result;

  // Cloudflare returns pages under `records`, not `data`
  if (result.status === "completed" || result.records) {
    return {
      success: true,
      status: "completed",
      data: result.records || result,
    };
  }

  if (result.status === "failed" || result.error) {
    return {
      success: false,
      status: "failed",
      error: result.error || "Crawl job failed",
    };
  }

  return {
    success: true,
    status: "running",
    data: result,
  };
}
