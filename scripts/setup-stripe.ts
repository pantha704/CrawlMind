import Stripe from "stripe";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-02-25.clover",
});

async function main() {
  console.log("Setting up Stripe Products for CrawlMind...");

  // 1. Spark (Free)
  const sparkProduct = await stripe.products.create({
    name: "CrawlMind Spark",
    description: "Free tier for curious explorers.",
    metadata: { plan: "SPARK" },
  });
  console.log(`✅ Spark Product Created: ${sparkProduct.id}`);
  // Free tiers typically don't need a Stripe price, but if you want one for consistency:
  // const sparkPrice = await stripe.prices.create({ product: sparkProduct.id, unit_amount: 0, currency: 'usd', recurring: { interval: 'month' }});

  // 2. Pro
  const proProduct = await stripe.products.create({
    name: "CrawlMind Pro",
    description: "For power users. 25 crawls/day, Full JS rendering, AI URL discovery.",
    metadata: { plan: "PRO" },
  });
  const proPrice = await stripe.prices.create({
    product: proProduct.id,
    unit_amount: 1200, // $12.00
    currency: "usd",
    recurring: { interval: "month" },
  });
  console.log(`✅ Pro Product Created: ${proProduct.id}`);
  console.log(`   Pro Price ID: ${proPrice.id} (Add to .env.local as STRIPE_PRO_PRICE_ID)`);

  // 3. Scale
  const scaleProduct = await stripe.products.create({
    name: "CrawlMind Scale",
    description: "For teams and pipelines. 150 crawls/day, Scheduled crawls, Webhook delivery.",
    metadata: { plan: "SCALE" },
  });
  const scalePrice = await stripe.prices.create({
    product: scaleProduct.id,
    unit_amount: 3900, // $39.00
    currency: "usd",
    recurring: { interval: "month" },
  });
  console.log(`✅ Scale Product Created: ${scaleProduct.id}`);
  console.log(`   Scale Price ID: ${scalePrice.id} (Add to .env.local as STRIPE_SCALE_PRICE_ID)`);

  console.log("\nSetup complete! Remember to add the standard checkout webhook endpoint to your Stripe dashboard:");
  console.log(`URL: <your-domain>/api/webhooks/stripe`);
  console.log("Events to listen for: checkout.session.completed, customer.subscription.deleted");
}

main().catch(console.error);
