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
      
    } catch (error: any) {
      console.error(`[CF] Fetch error for account ${cred.accountId}:`, error);
      lastError = error.message;
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

export async function getCrawlStatus(jobId: string, accountId?: string | null): Promise<CrawlStatusResult> {
  // Use provided accountId, or fallback to the single environment variable one
  const targetAccountId = accountId || process.env.CLOUDFLARE_ACCOUNT_ID;
  
  // Find the token for this account
  let tokenToUse = process.env.CLOUDFLARE_API_TOKEN;
  if (targetAccountId) {
    const matchedCred = credentials.find(c => c.accountId === targetAccountId);
    if (matchedCred) {
      tokenToUse = matchedCred.apiToken;
    }
  }

  if (!targetAccountId || !tokenToUse) {
     return { success: false, status: "failed", error: "Missing credential details for status check" };
  }

  const CF_BASE_URL = `https://api.cloudflare.com/client/v4/accounts/${targetAccountId}/browser-rendering`;

  console.log(`[CF] Checking status for jobId: ${jobId} on account: ${targetAccountId}`);
  
  try {
    const response = await fetch(`${CF_BASE_URL}/crawl/${jobId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${tokenToUse}`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();
    
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
  } catch (error: any) {
    console.error("[CF] Fetch status error:", error);
    return {
      success: false,
      status: "failed",
      error: error.message || "Failed to fetch crawl status",
    };
  }
}
