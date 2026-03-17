import { Client } from "@upstash/qstash";

const qstashClient = new Client({
  token: process.env.QSTASH_TOKEN!,
});

/**
 * Schedule a delayed check of a crawl job's status.
 * QStash will call our webhook endpoint after the delay,
 * even if the user closed their browser tab.
 */
export async function scheduleCrawlSync(
  jobId: string,
  delaySec: number = 30
) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";

  await qstashClient.publishJSON({
    url: `${appUrl}/api/webhooks/crawl-sync`,
    body: { jobId },
    delay: delaySec,
    retries: 3,
  });
}
