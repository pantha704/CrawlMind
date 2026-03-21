import { startCrawlJob, getCrawlStatus } from "./lib/cloudflare";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

dotenv.config({ path: ".env.local" });

/**
 * COMPREHENSIVE CRAWL STRATEGY:
 * 1. Target URL: learn.blueshift.gg (Course section)
 * 2. High Depth (10) for full structure traversal
 * 3. High Limit (500) to capture all lessons
 * 4. Markdown format for analysis
 * 5. Include Patterns to stay on the learning sub-site
 */

async function runComprehensiveCrawl() {
  const url = "https://learn.blueshift.gg/en/courses/pinocchio-for-dummies/pinocchio-101";
  console.log(`📡 Initiating Comprehensive Showcase Crawl for: ${url}`);
  
  const config = {
    url,
    limit: 500, // High limit for "whole site" feeling
    depth: 10,   // Deep enough for nested lessons
    formats: ["markdown"],
    render: true,
    options: {
      includePatterns: ["**/en/courses/**"], // Stay within courses
      waitFor: 2000 // Give JS time to render content
    }
  };

  let start;
  let retries = 3;
  
  while (retries > 0) {
    start = await startCrawlJob(config as any);
    if (start.success && start.jobId) break;
    
    if (start.error?.includes("429") || start.error?.toLowerCase().includes("rate limit")) {
      console.warn(`🚨 Rate limit hit. Retrying in 60s... (${retries} attempts left)`);
      await new Promise(r => setTimeout(r, 60000));
      retries--;
    } else {
      console.error("❌ Failed to start comprehensive crawl:", start.error);
      return;
    }
  }

  if (!start || !start.success || !start.jobId) {
    console.error("❌ Could not start crawl after multiple retries.");
    return;
  }

  const jobId = start.jobId;
  console.log(`✅ Master Job started! ID: ${jobId}`);
  console.log("⏳ Starting deep polling... Results will be saved upon completion.");

  const startTime = Date.now();
  const maxPollTime = 15 * 60 * 1000; // 15 minutes max for a large crawl

  while (Date.now() - startTime < maxPollTime) {
    await new Promise(r => setTimeout(r, 20000)); // Poll every 20s
    const status = await getCrawlStatus(jobId);
    
    console.log(`📊 Progress: [${status.status}] - Time elapsed: ${Math.floor((Date.now() - startTime) / 1000)}s`);
    
    if (status.status === "completed" && status.data) {
      console.log("🏆 Comprehensive crawl finished!");
      const data = status.data as any;
      const pages = Array.isArray(data) ? data : (data.data || []);
      console.log(`📄 Successfully extracted ${pages.length} pages.`);
      
      const fileName = `deep_crawl_results_${jobId}.json`;
      const reportPath = path.join(process.cwd(), fileName);
      fs.writeFileSync(reportPath, JSON.stringify(data, null, 2));
      console.log(`💾 Data archived to ${reportPath}`);
      return;
    }

    if (status.status === "failed") {
      console.error("❌ Job failed during execution:", status.error);
      return;
    }
  }

  console.log("⏰ Master crawl poll timed out.");
}

runComprehensiveCrawl().catch(console.error);
