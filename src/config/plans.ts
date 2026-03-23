/**
 * Single Source of Truth — Plan Configuration
 *
 * All plan-related data lives here. Import from this file
 * instead of hardcoding plan values across the app.
 */

export type PlanId = "SPARK" | "PRO" | "PRO_PLUS" | "SCALE";

export interface PlanLimits {
  maxCrawlsPerDay: number;
  maxPagesPerCrawl: number;
  allowAI: boolean;
  allowJS: boolean;
  aiQueriesPerCrawl: number;
  historyDays: number;
  renderAllowed: boolean;
}

export interface PlanPricing {
  price: string;      // e.g. "Free", "₹999"
  period: string;     // e.g. "", "/mo"
}

export interface PlanUI {
  name: string;       // Display name e.g. "Spark", "Pro"
  tagline: string;
  cta: string;        // CTA button text
  popular?: boolean;
  inherits: string | null;
  features: string[];
}

export interface PlanConfig {
  id: PlanId;
  label: string;      // Full label e.g. "Spark (Free)", "Pro (₹999/mo)"
  limits: PlanLimits;
  pricing: PlanPricing;
  ui: PlanUI;
}

export const PLANS: Record<PlanId, PlanConfig> = {
  SPARK: {
    id: "SPARK",
    label: "Spark (Free)",
    limits: {
      maxCrawlsPerDay: 5,
      maxPagesPerCrawl: 100,
      allowAI: false,
      allowJS: false,
      aiQueriesPerCrawl: 3,
      historyDays: 7,
      renderAllowed: false,
    },
    pricing: {
      price: "Free",
      period: "",
    },
    ui: {
      name: "Spark",
      tagline: "For curious explorers",
      cta: "Get Started Free",
      inherits: null,
      features: [
        "5 crawls per day",
        "Up to 100 pages per crawl",
        "Markdown + JSON output",
        "3 AI queries per crawl",
        "7-day result history",
      ],
    },
  },
  PRO: {
    id: "PRO",
    label: "Pro (₹999/mo)",
    limits: {
      maxCrawlsPerDay: 25,
      maxPagesPerCrawl: 100,
      allowAI: true,
      allowJS: true,
      aiQueriesPerCrawl: Infinity,
      historyDays: 90,
      renderAllowed: true,
    },
    pricing: {
      price: "₹999",
      period: "/mo",
    },
    ui: {
      name: "Pro",
      tagline: "For power users",
      cta: "Start 7-day trial",
      popular: true,
      inherits: "Everything in Spark, plus:",
      features: [
        "25 crawls per day",
        "Up to 100 pages per crawl",
        "Full JS rendering",
        "Unlimited AI queries",
        "AI-powered URL discovery",
        "Analytics dashboard",
        "90-day result history",
      ],
    },
  },
  PRO_PLUS: {
    id: "PRO_PLUS",
    label: "Pro+ (₹1,999/mo)",
    limits: {
      maxCrawlsPerDay: 75,
      maxPagesPerCrawl: 100,
      allowAI: true,
      allowJS: true,
      aiQueriesPerCrawl: Infinity,
      historyDays: 180,
      renderAllowed: true,
    },
    pricing: {
      price: "₹1,999",
      period: "/mo",
    },
    ui: {
      name: "Pro+",
      tagline: "For serious builders",
      cta: "Get Pro+",
      inherits: "Everything in Pro, plus:",
      features: [
        "75 crawls per day",
        "Up to 100 pages per crawl",
        "Priority crawl queue",
        "180-day result history",
        "Webhook delivery",
      ],
    },
  },
  SCALE: {
    id: "SCALE",
    label: "Scale (₹3,299/mo)",
    limits: {
      maxCrawlsPerDay: 150,
      maxPagesPerCrawl: 100,
      allowAI: true,
      allowJS: true,
      aiQueriesPerCrawl: Infinity,
      historyDays: 365,
      renderAllowed: true,
    },
    pricing: {
      price: "₹3,299",
      period: "/mo",
    },
    ui: {
      name: "Scale",
      tagline: "For teams and pipelines",
      cta: "Get Scale",
      inherits: "Everything in Pro+, plus:",
      features: [
        "150 crawls per day",
        "Up to 100 pages per crawl",
        "Scheduled & recurring crawls",
        "Team seats (up to 5)",
        "API access",
        "365-day result history",
        "Dedicated support",
      ],
    },
  },
};

/** Ordered list of plans for UI rendering (pricing page, etc.) */
export const PLAN_ORDER: PlanId[] = ["SPARK", "PRO", "PRO_PLUS", "SCALE"];

/** Get plan config, defaults to SPARK if not found */
export function getPlan(planId: string): PlanConfig {
  return PLANS[planId as PlanId] || PLANS.SPARK;
}

/** Get tier limits in the shape used by API routes */
export function getTierLimits(planId: string) {
  const plan = getPlan(planId);
  return {
    label: plan.label,
    name: plan.ui.name,
    maxCrawls: plan.limits.maxCrawlsPerDay,
    maxPages: plan.limits.maxPagesPerCrawl,
    allowAI: plan.limits.allowAI,
    allowJS: plan.limits.allowJS,
  };
}
