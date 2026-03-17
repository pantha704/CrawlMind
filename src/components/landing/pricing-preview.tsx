"use client";

import { motion } from "framer-motion";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const plans = [
  {
    name: "Spark",
    tagline: "For curious explorers",
    price: "Free",
    period: "",
    cta: "Get Started Free",
    ctaVariant: "outline" as const,
    features: [
      { text: "2 crawls per day", included: true },
      { text: "Up to 30 pages per crawl", included: true },
      { text: "Static mode only", included: true },
      { text: "3 AI queries per crawl", included: true },
      { text: "Markdown + JSON output", included: true },
      { text: "7-day result history", included: true },
      { text: "JS rendering", included: false },
      { text: "Analytics dashboard", included: false },
    ],
  },
  {
    name: "Pro",
    tagline: "For power users",
    price: "$12",
    period: "/mo",
    cta: "Start 7-day trial",
    ctaVariant: "default" as const,
    popular: true,
    features: [
      { text: "25 crawls per day", included: true },
      { text: "Up to 500 pages per crawl", included: true },
      { text: "Full JS rendering", included: true },
      { text: "Unlimited AI queries", included: true },
      { text: "Plain English → URL discovery", included: true },
      { text: "Analytics dashboard", included: true },
      { text: "90-day result history", included: true },
      { text: "Priority queue", included: true },
    ],
  },
  {
    name: "Scale",
    tagline: "For teams and pipelines",
    price: "$39",
    period: "/mo",
    cta: "Get Scale",
    ctaVariant: "outline" as const,
    features: [
      { text: "150 crawls per day", included: true },
      { text: "Up to 5,000 pages per crawl", included: true },
      { text: "Scheduled/recurring crawls", included: true },
      { text: "Webhook delivery", included: true },
      { text: "Team seats (up to 5)", included: true },
      { text: "API access", included: true },
      { text: "365-day result history", included: true },
      { text: "Dedicated support", included: true },
    ],
  },
];

export function PricingPreview() {
  return (
    <section id="pricing" className="py-24 px-6 bg-secondary/30">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Simple, transparent pricing
          </h2>
          <p className="text-muted-foreground text-lg">
            Start free. Upgrade when you need more power.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`relative p-8 rounded-2xl border ${
                plan.popular
                  ? "border-primary/50 bg-card glow-cyan"
                  : "border-border/50 bg-card/50"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-medium">
                  Most Popular
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-xl font-bold">{plan.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {plan.tagline}
                </p>
              </div>

              <div className="mb-6">
                <span className="text-4xl font-bold">{plan.price}</span>
                <span className="text-muted-foreground">{plan.period}</span>
              </div>

              <Link href="/signup">
                <Button
                  variant={plan.ctaVariant}
                  className={`w-full mb-8 ${plan.popular ? "glow-cyan" : ""}`}
                  size="lg"
                >
                  {plan.cta}
                </Button>
              </Link>

              <ul className="space-y-3">
                {plan.features.map((f) => (
                  <li key={f.text} className="flex items-start gap-3 text-sm">
                    {f.included ? (
                      <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    ) : (
                      <X className="w-4 h-4 text-muted-foreground/40 mt-0.5 shrink-0" />
                    )}
                    <span
                      className={
                        f.included
                          ? "text-foreground"
                          : "text-muted-foreground/40"
                      }
                    >
                      {f.text}
                    </span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
