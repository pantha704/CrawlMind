import { getCrawlStatus } from "./lib/cloudflare";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

dotenv.config({ path: ".env.local" });

async function checkStatus(jobId: string) {
  if (!jobId) {
    console.error("Please provide a jobId as an argument.");
    process.exit(1);
  }

  console.log(`🔍 Fetching results for Job ID: ${jobId}`);
  const status = await getCrawlStatus(jobId);

  console.log(`📊 Status: ${status.status}`);
  if (status.error) console.error(`❌ Error: ${status.error}`);

  if (status.data) {
    const reportPath = path.join(process.cwd(), `crawl_results_${jobId}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(status.data, null, 2));
    console.log(`✅ Data retrieved and saved to ${reportPath}`);
    
    // Print a summary of found pages
    const data = status.data as any;
    const pages = Array.isArray(data) ? data : (data.data || []);
    console.log(`📄 Found ${pages.length} pages.`);
    pages.slice(0, 5).forEach((p: any, i: number) => {
       console.log(`${i+1}. [${p.url}] (${p.status})`);
    });
  } else {
    console.log("⚠️ No data available yet. Still crawling or failed.");
  }
}

const argJobId = process.argv[2];
checkStatus(argJobId).catch(console.error);
