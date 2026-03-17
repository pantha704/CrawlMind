import { startCrawlJob, getCrawlStatus } from "./lib/cloudflare";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

dotenv.config({ path: ".env.local" });

async function runShowcase() {
  const url = "https://learn.blueshift.gg/en/courses/pinocchio-for-dummies/pinocchio-101";
  console.log(`🚀 Starting Super-Crawl for: ${url}`);
  
  const config = {
    url,
    limit: 100,
    depth: 5,
    formats: ["markdown", "html", "json"],
    render: true
  };

  const start = await startCrawlJob(config as any);

  if (!start.success || !start.jobId) {
    console.error("❌ Failed to start showcase crawl:", start.error);
    return;
  }

  const jobId = start.jobId;
  console.log(`✅ Job started! ID: ${jobId}`);
  console.log("⏳ Polling for results (this might take a few minutes)...");

  // Poll for up to 5 minutes
  const startTime = Date.now();
  const timeout = 5 * 60 * 1000;

  while (Date.now() - startTime < timeout) {
    await new Promise(r => setTimeout(r, 15000)); // Poll every 15s
    const status = await getCrawlStatus(jobId);
    
    console.log(`📊 Status: [${status.status}]`);
    
    if (status.status === "completed" && status.data) {
      console.log("🏁 Crawl completed successfully!");
      const data = status.data as any;
      const pages = Array.isArray(data) ? data : (data.data || []);
      console.log(`📄 Total pages extracted: ${pages.length}`);
      
      // Save results to a file for reporting
      const reportPath = path.join(process.cwd(), "showcase_results.json");
      fs.writeFileSync(reportPath, JSON.stringify(data, null, 2));
      console.log(`💾 Results saved to ${reportPath}`);
      return;
    }

    if (status.status === "failed") {
      console.error("❌ Crawl failed:", status.error);
      return;
    }
  }

  console.log("⏰ Showcase crawl poll timed out.");
}

runShowcase().catch(console.error);
