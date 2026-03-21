import { startCrawlJob } from "./lib/cloudflare";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function run() {
  const url = "https://learn.blueshift.gg/en/courses";
  console.log(`🚀 Starting Showcase Crawl from: ${url}`);
  
  const config = {
    url,
    limit: 20,
    depth: 3,
    formats: ["markdown"],
    render: true,
    options: {
      includePatterns: ["**/en/courses/**"]
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const start = await startCrawlJob(config as any);

  if (!start.success) {
    console.error("❌ Failed to start showcase crawl:", start.error);
    return;
  }

  console.log(`✅ Job started! ID: ${start.jobId}`);
  console.log("Wait for a few minutes then check status with: bun run src/check_status.ts " + start.jobId);
}

run().catch(console.error);
