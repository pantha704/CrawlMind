/**
 * SMOKE TEST: Verify Cloudflare Crawl API works end-to-end
 * - Starts a tiny crawl (limit: 2, depth: 1)
 * - Polls until completion or failure
 * - Prints raw API responses for debugging
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const CF_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN!;
const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID!;
const CF_BASE = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/browser-rendering`;

async function smokeTest() {
  console.log("=== CLOUDFLARE CRAWL SMOKE TEST ===");
  console.log(`Token: ${CF_API_TOKEN ? CF_API_TOKEN.slice(0, 8) + "..." : "MISSING!"}`);
  console.log(`Account: ${CF_ACCOUNT_ID || "MISSING!"}`);

  // Step 1: Start a minimal crawl
  const url = "https://learn.blueshift.gg/en/courses/pinocchio-for-dummies/pinocchio-101";
  console.log(`\n1️⃣  Starting minimal crawl: ${url}`);
  console.log("   Config: limit=2, depth=1, format=markdown\n");

  const startRes = await fetch(`${CF_BASE}/crawl`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${CF_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url,
      limit: 2,
      depth: 1,
      formats: ["markdown"],
    }),
  });

  const startData = await startRes.json();
  console.log(`   HTTP ${startRes.status} ${startRes.statusText}`);
  console.log("   Response:", JSON.stringify(startData, null, 2));

  if (!startRes.ok || !startData.success) {
    console.error("\n❌ CRAWL START FAILED");
    if (startRes.status === 429) {
      console.error("   Reason: Rate limit exceeded. Wait a few minutes and retry.");
    }
    return;
  }

  const jobId = startData.result;
  console.log(`\n✅ Job created: ${jobId}`);

  // Step 2: Poll for results
  console.log("\n2️⃣  Polling for results (max 3 minutes)...\n");
  const start = Date.now();
  const timeout = 3 * 60 * 1000;

  while (Date.now() - start < timeout) {
    await new Promise(r => setTimeout(r, 10000));
    const elapsed = Math.floor((Date.now() - start) / 1000);

    const statusRes = await fetch(`${CF_BASE}/crawl/${jobId}`, {
      headers: {
        Authorization: `Bearer ${CF_API_TOKEN}`,
        "Content-Type": "application/json",
      },
    });

    const statusData = await statusRes.json();
    const result = statusData.result || {};
    console.log(`   [${elapsed}s] HTTP ${statusRes.status} | status=${result.status} | pages=${Array.isArray(result.data) ? result.data.length : "?"}`);

    if (result.status === "completed" && result.data) {
      const pages = Array.isArray(result.data) ? result.data : [];
      console.log(`\n🏆 CRAWL COMPLETED — ${pages.length} page(s) extracted`);
      for (const page of pages) {
        console.log(`\n   📄 ${page.url || page.metadata?.sourceURL || "unknown"}`);
        console.log(`      Title: ${page.metadata?.title || "n/a"}`);
        const md = page.markdown || page.content || "";
        console.log(`      Markdown length: ${md.length} chars`);
        console.log(`      Preview: ${md.slice(0, 200)}...`);
      }
      console.log("\n✅ SMOKE TEST PASSED — Crawl backend is functional!");
      return;
    }

    if (result.status === "failed") {
      console.error("\n❌ CRAWL FAILED:", result.error || statusData);
      return;
    }
  }

  console.log("\n⏰ TIMEOUT — crawl did not complete in 3 minutes.");
}

smokeTest().catch(e => {
  console.error("💥 Unhandled error:", e);
});
