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
  // VERCEL_URL is automatically set by Vercel to the deployment URL (e.g. crawl-mind.vercel.app)
  // We prefer the explicit APP_URL but fall back to VERCEL_URL so QStash never calls localhost in prod.
  const vercelUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.startsWith("http://localhost")
    ? (vercelUrl ?? process.env.NEXT_PUBLIC_APP_URL)
    : (process.env.NEXT_PUBLIC_APP_URL ?? vercelUrl ?? "http://localhost:3001");


  await qstashClient.publishJSON({
    url: `${appUrl}/api/webhooks/crawl-sync`,
    body: { jobId },
    delay: delaySec,
    retries: 3,
  });
}
