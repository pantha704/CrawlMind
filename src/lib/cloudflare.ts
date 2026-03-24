interface CfCredential {
  accountId: string;
  apiToken: string;
}

function getCredentials(): CfCredential[] {
  const credsStr = process.env.CLOUDFLARE_CREDENTIALS;
  if (credsStr) {
    // Expected format: acc1:token1,acc2:token2
    return credsStr.split(",").map(pair => {
      const [accountId, apiToken] = pair.split(":");
      return { accountId: accountId?.trim() || "", apiToken: apiToken?.trim() || "" };
    }).filter(cred => cred.accountId && cred.apiToken);
  }
  
  // Fallback to single account if CLOUDFLARE_CREDENTIALS is not set
  const CF_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
  const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
  
  if (CF_API_TOKEN && CF_ACCOUNT_ID) {
    return [{ accountId: CF_ACCOUNT_ID, apiToken: CF_API_TOKEN }];
  }
  
  return [];
}

const credentials = getCredentials();
let currentCredIndex = 0;

export interface CrawlConfig {
  url: string;
  source?: "all" | "sitemaps" | "links";
  limit?: number;
  depth?: number;
  formats?: ("html" | "markdown" | "json")[];
  render?: boolean;
  maxAge?: number;
  modifiedSince?: number;
  crawlPurposes?: ("search" | "ai-input" | "ai-train")[];
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
  accountId?: string;
  error?: string;
}

interface CrawlStatusResult {
  success: boolean;
  status: "running" | "completed" | "failed";
  data?: unknown;
  error?: string;
}


export async function startCrawlJob(config: CrawlConfig): Promise<CrawlStartResult> {
  if (credentials.length === 0) {
    return { success: false, jobId: null, error: "No Cloudflare credentials configured" };
  }

  const attempts = credentials.length;
  let lastError = "Failed to start crawl job";

  for (let i = 0; i < attempts; i++) {
    const cred = credentials[currentCredIndex];
    const CF_BASE_URL = `https://api.cloudflare.com/client/v4/accounts/${cred.accountId}/browser-rendering`;
    
    try {
      const response = await fetch(`${CF_BASE_URL}/crawl`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${cred.apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(config),
      });

      const data = await response.json();
      
      if (!response.ok || !data.success) {
        console.error(`[CF] Start crawl failed for account ${cred.accountId}:`, data);
        
        const errorMessage = data.errors?.[0]?.message || "";
        lastError = errorMessage || `Status code ${response.status}`;
        
        // If it's a rate limit or quota issue, we should try the next account.
        // Even if it's not explicitly a 429, we'll try the next account just in case it's a block/limit.
        currentCredIndex = (currentCredIndex + 1) % credentials.length;
        continue;
      }

      // Cloudflare may return the ID as `data.result` (string) or `data.result.id`
      const jobId =
        typeof data.result === "string"
          ? data.result
          : data.result?.id || data.result?.jobId || null;

      console.log(`[CF] Extracted jobId: ${jobId} using account: ${cred.accountId}`);

      return {
        success: true,
        jobId,
        accountId: cred.accountId,
      };
      
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`[CF] Fetch error for account ${cred.accountId}:`, error);
      lastError = msg;
      currentCredIndex = (currentCredIndex + 1) % credentials.length;
    }
  }

  // If we exhausted all credentials
  return {
    success: false,
    jobId: null,
    error: `Exhausted all CF API credentials. Last error: ${lastError}`,
  };
}

function getCredForAccount(accountId?: string | null): { targetAccountId: string; tokenToUse: string } | null {
  const targetAccountId = accountId || process.env.CLOUDFLARE_ACCOUNT_ID;
  let tokenToUse = process.env.CLOUDFLARE_API_TOKEN;
  if (targetAccountId) {
    const matchedCred = credentials.find(c => c.accountId === targetAccountId);
    if (matchedCred) tokenToUse = matchedCred.apiToken;
  }
  if (!targetAccountId || !tokenToUse) return null;
  return { targetAccountId, tokenToUse };
}

/**
 * Lightweight status-only check — uses ?limit=1 to avoid downloading records.
 * Safe to call frequently; avoids timeouts on large crawls.
 */
export async function getCrawlStatus(jobId: string, accountId?: string | null): Promise<CrawlStatusResult> {
  const cred = getCredForAccount(accountId);
  if (!cred) return { success: false, status: "failed", error: "Missing credentials" };

  const { targetAccountId, tokenToUse } = cred;
  const CF_BASE_URL = `https://api.cloudflare.com/client/v4/accounts/${targetAccountId}/browser-rendering`;
  console.log(`[CF] Checking status for jobId: ${jobId} on account: ${targetAccountId}`);

  try {
    const response = await fetch(`${CF_BASE_URL}/crawl/${jobId}?limit=1`, {
      headers: { Authorization: `Bearer ${tokenToUse}` },
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      return { success: false, status: "failed", error: data.errors?.[0]?.message || "Status check failed" };
    }

    const result = data.result;
    if (result.status === "completed") return { success: true, status: "completed" };
    if (result.status === "failed") return { success: false, status: "failed", error: result.error };
    return { success: true, status: "running" };
  } catch (error: unknown) {
    return { success: false, status: "failed", error: error instanceof Error ? error.message : String(error) };
  }
}

interface CrawlResultChunk {
  success: boolean;
  records?: unknown[];
  cursor?: string | null;
  error?: string;
}

/**
 * Heavy fetch — downloads a chunk of crawled page records from Cloudflare.
 */
export async function getCrawlResultsChunk(jobId: string, accountId?: string | null, cursor?: string | null): Promise<CrawlResultChunk> {
  const cred = getCredForAccount(accountId);
  if (!cred) return { success: false, error: "Missing credentials" };

  const { targetAccountId, tokenToUse } = cred;
  const CF_BASE_URL = `https://api.cloudflare.com/client/v4/accounts/${targetAccountId}/browser-rendering`;
  console.log(`[CF] Fetching results chunk for jobId: ${jobId}, cursor: ${cursor}`);

  try {
    const url = new URL(`${CF_BASE_URL}/crawl/${jobId}`);
    url.searchParams.append("limit", "10"); // Vercel hobby limits mean we can't do large limits natively
    if (cursor) {
      url.searchParams.append("cursor", cursor);
    }

    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${tokenToUse}` },
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
      return { success: false, error: data.errors?.[0]?.message || "Failed to fetch results" };
    }
    return { 
      success: true, 
      records: data.result?.records || [],
      cursor: data.result?.cursor,
    };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Fetch ALL crawl results by paginating through cursors.
 * For typical crawls (limit: 20-100), this completes in a few seconds.
 */
export async function getAllCrawlResults(jobId: string, accountId?: string | null): Promise<{ success: boolean; records: unknown[]; error?: string }> {
  const allRecords: unknown[] = [];
  let cursor: string | null = null;
  let attempts = 0;
  const maxAttempts = 50; // Safety limit

  while (attempts < maxAttempts) {
    attempts++;
    const chunk = await getCrawlResultsChunk(jobId, accountId, cursor);
    
    if (!chunk.success) {
      return { success: false, records: allRecords, error: chunk.error };
    }

    if (chunk.records?.length) {
      allRecords.push(...chunk.records);
    }

    if (!chunk.cursor) break; // No more pages
    cursor = chunk.cursor;
  }

  return { success: true, records: allRecords };
}
