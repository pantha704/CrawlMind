import { startCrawlJob, getCrawlStatus } from "./lib/cloudflare";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function run() {
  const url = "https://learn.blueshift.gg/en/courses/pinocchio-for-dummies/pinocchio-101";
  console.log(`Starting comprehensive crawl of ${url}...`);
  
  const start = await startCrawlJob({
    url,
    maxPages: 50,
    depth: 3,
    formats: ["markdown", "html"],
    render: true
  });

  if (!start.success || !start.jobId) {
    console.error("Failed to start job:", start.error);
    return;
  }

  console.log(`Job started. ID: ${start.jobId}. Waiting for completion...`);
  
  // Poll until done or max 2 minutes
  for (let i = 0; i < 24; i++) {
    await new Promise(r => setTimeout(r, 10000));
    const status = await getCrawlStatus(start.jobId);
    console.log(`Status check ${i+1}: ${status.status}`);
    
    if (status.status === "completed") {
      console.log("Crawl completed!");
      // Save data for analysis
      const fs = require('fs');
      fs.writeFileSync('/tmp/crawl_results.json', JSON.stringify(status.data, null, 2));
      return;
    }
    if (status.status === "failed") {
      console.error("Crawl failed:", status.error);
      return;
    }
  }
  console.log("Polling timed out.");
}

run();
