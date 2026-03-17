"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/landing/navbar";

const plans = [
  {
    name: "Spark",
    id: "SPARK",
    tagline: "For curious explorers",
    price: "Free",
    period: "",
    cta: "Get Started Free",
    inherits: null,
    features: [
      "2 crawls per day",
      "Up to 30 pages per crawl",
      "Markdown + JSON output",
      "3 AI queries per crawl",
      "7-day result history",
    ],
  },
  {
    name: "Pro",
    id: "PRO",
    tagline: "For power users",
    price: "$12",
    period: "/mo",
    cta: "Start 7-day trial",
    popular: true,
    inherits: "Everything in Spark, plus:",
    features: [
      "25 crawls per day",
      "Up to 500 pages per crawl",
      "Full JS rendering",
      "Unlimited AI queries",
      "AI-powered URL discovery",
      "Analytics dashboard",
      "90-day result history",
    ],
  },
  {
    name: "Pro+",
    id: "PRO_PLUS",
    tagline: "For serious builders",
    price: "$24",
    period: "/mo",
    cta: "Get Pro+",
    inherits: "Everything in Pro, plus:",
    features: [
      "75 crawls per day",
      "Up to 1,000 pages per crawl",
      "Priority crawl queue",
      "180-day result history",
      "Webhook delivery",
    ],
  },
  {
    name: "Scale",
    id: "SCALE",
    tagline: "For teams and pipelines",
    price: "$39",
    period: "/mo",
    cta: "Get Scale",
    inherits: "Everything in Pro+, plus:",
    features: [
      "150 crawls per day",
      "Up to 5,000 pages per crawl",
      "Scheduled & recurring crawls",
      "Team seats (up to 5)",
      "API access",
      "365-day result history",
      "Dedicated support",
    ],
  },
];

export default function PricingPage() {
  const { data: session, isPending: authLoading } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const handleCheckout = async (planId: string) => {
    if (!session) {
      router.push("/signup");
      return;
    }

    if (planId === "SPARK") {
      router.push("/dashboard");
      return;
    }

    setLoading(planId);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || "Failed to create checkout session");
      }
    } catch (err) {
      console.error(err);
      alert("Something went wrong. Please try again.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <Navbar />

      {/* Background Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-primary/5 blur-[120px] pointer-events-none" />

      <main className="pt-32 pb-24 px-6 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight gradient-text">
            Simple, transparent pricing
          </h1>
          <p className="text-muted-foreground text-xl max-w-2xl mx-auto">
            Start for free and upgrade when you need more power for large-scale data extraction.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6 items-start">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.08 }}
              whileHover={{ y: -4 }}
              className={`relative p-6 rounded-2xl border transition-all duration-300 ${
                plan.popular
                  ? "border-primary/50 shadow-2xl shadow-primary/10 bg-card glow-cyan"
                  : "border-border/50 bg-card/40 hover:border-border hover:bg-card/60"
              }`}
            >
              {plan.popular && (
                <>
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none rounded-2xl" />
                  <div className="absolute top-0 right-8 transform -translate-y-1/2 z-20">
                    <span className="bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-widest py-1 px-3 rounded-full shadow-lg shadow-primary/20">
                      Most Popular
                    </span>
                  </div>
                </>
              )}

              <div className="mb-5 relative z-10">
                <h3 className="text-xl font-bold">{plan.name}</h3>
                <p className="text-muted-foreground mt-1 text-sm">{plan.tagline}</p>
              </div>

              <div className="mb-6 relative z-10 flex items-baseline gap-1.5">
                <span className="text-4xl font-extrabold tracking-tight">{plan.price}</span>
                {plan.period && <span className="text-muted-foreground font-medium text-sm">{plan.period}</span>}
              </div>

              <Button
                variant={plan.popular ? "default" : "outline"}
                className={`w-full mb-6 relative z-10 h-11 text-sm font-medium ${plan.popular ? "glow-cyan hover:brightness-110" : ""}`}
                disabled={authLoading || loading !== null}
                onClick={() => handleCheckout(plan.id)}
              >
                {loading === plan.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  plan.cta
                )}
              </Button>

              <div className="space-y-3 relative z-10">
                {plan.inherits && (
                  <p className="text-xs font-semibold text-primary mb-3 pb-2 border-b border-border/30">
                    {plan.inherits}
                  </p>
                )}
                {!plan.inherits && (
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 pb-2 border-b border-border/30">
                    What&apos;s included
                  </p>
                )}
                <ul className="space-y-2.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm">
                      <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <span className="text-foreground font-medium leading-tight">
                        {f}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  );
}
