import { PrismaClient } from "@prisma/client";
import { writeFileSync } from "fs";
import { resolve } from "path";

const prisma = new PrismaClient();

async function main() {
  const jobId = process.argv[2];
  let job;

  if (jobId) {
    job = await prisma.crawlJob.findUnique({ where: { id: jobId } });
  } else {
    // get latest job
    job = await prisma.crawlJob.findFirst({
      orderBy: { createdAt: "desc" },
    });
  }

  if (!job) {
    console.log("No job found.");
    return;
  }

  console.log(`=========================
Found Job ID: ${job.id}
Query: ${job.query}
Status in DB: ${job.status}
CF Job ID: ${job.cfJobId}
CF Account ID: ${job.cfAccountId}
Format: ${job.format}
=========================
`);

  if (!job.cfJobId || !job.cfAccountId) {
    console.log("Job doesn't have CF credentials/ID linked yet");
    return;
  }

  // Find token from environment
  const credsStr = process.env.CLOUDFLARE_CREDENTIALS || "";
  let token = process.env.CLOUDFLARE_API_TOKEN;

  const pairs = credsStr.split(",");
  for (const pair of pairs) {
    const [acc, tok] = pair.split(":");
    if (acc === job.cfAccountId) {
      token = tok;
      break;
    }
  }

  if (!token) {
    console.error("Could not find matching Cloudflare API token for account:", job.cfAccountId);
    return;
  }

  const CF_BASE_URL = `https://api.cloudflare.com/client/v4/accounts/${job.cfAccountId}/browser-rendering`;

  console.log("Fetching job status/result from Cloudflare...");
  
  const res = await fetch(`${CF_BASE_URL}/crawl/${job.cfJobId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  const data = await res.json();
  
  if (!res.ok) {
    console.error("API error response:", JSON.stringify(data, null, 2));
    return;
  }

  const status = data.result?.status;
  const pagesDone = data.result?.pages_done;
  const pagesTotal = data.result?.pages_total;
  const records = data.result?.records || [];

  console.log(`CF Status: ${status} (Pages: ${pagesDone}/${pagesTotal})`);
  console.log(`Results array contains ${records.length} records.`);

  const outFile = resolve(process.cwd(), `cf_result_${job.id}.json`);
  writeFileSync(outFile, JSON.stringify(data, null, 2));
  console.log(`\nRaw JSON response saved to: ${outFile}`);

  // Summarize what CF crawler actually saw
  if (records.length > 0) {
    console.log("\n--- Crawl Record Summary ---");
    for (const rec of records) {
      console.log(`\nURL: ${rec.url}`);
      console.log(`HTTP Status: ${rec.http_status}`);
      console.log(`CF Bot Status: ${rec.status}`);
      if (rec.error) console.log(`Error: ${rec.error}`);
      if (rec.markdown) {
        console.log(`Content length (markdown): ${rec.markdown.length} characters`);
        console.log(`Sneak peek: ${rec.markdown.substring(0, 150).replace(/\n/g, " ")}...`);
      }
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
