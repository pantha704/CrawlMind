import Razorpay from "razorpay";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

async function main() {
  console.log("Creating Razorpay Plans...\n");

  // Pro Plan - ₹999/mo
  const proPlan = await razorpay.plans.create({
    period: "monthly",
    interval: 1,
    item: {
      name: "CrawlMind Pro",
      amount: 99900, // in paise (₹999)
      currency: "INR",
      description: "25 crawls/day, 500 pages, JS rendering, unlimited AI queries",
    },
  });
  console.log(`✅ Pro Plan created: ${proPlan.id}`);
  console.log(`   Add to .env.local: RAZORPAY_PRO_PLAN_ID=${proPlan.id}\n`);

  // Pro+ Plan - ₹1,999/mo
  const proPlusPlan = await razorpay.plans.create({
    period: "monthly",
    interval: 1,
    item: {
      name: "CrawlMind Pro+",
      amount: 199900, // in paise (₹1,999)
      currency: "INR",
      description: "75 crawls/day, 1000 pages, priority queue, webhooks",
    },
  });
  console.log(`✅ Pro+ Plan created: ${proPlusPlan.id}`);
  console.log(`   Add to .env.local: RAZORPAY_PRO_PLUS_PLAN_ID=${proPlusPlan.id}\n`);

  // Scale Plan - ₹3,299/mo
  const scalePlan = await razorpay.plans.create({
    period: "monthly",
    interval: 1,
    item: {
      name: "CrawlMind Scale",
      amount: 329900, // in paise (₹3,299)
      currency: "INR",
      description: "150 crawls/day, 5000 pages, scheduled crawls, team seats, API access",
    },
  });
  console.log(`✅ Scale Plan created: ${scalePlan.id}`);
  console.log(`   Add to .env.local: RAZORPAY_SCALE_PLAN_ID=${scalePlan.id}\n`);

  console.log("---");
  console.log("All plans created! Add the IDs above to your .env.local and Vercel env vars.");
}

main().catch(console.error);
