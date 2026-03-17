"use client";

import { motion } from "framer-motion";
import { TextCursorInput, Globe, MessageSquareText } from "lucide-react";

const steps = [
  {
    icon: TextCursorInput,
    title: "Input",
    description:
      "Type a URL, paste multiple URLs, or just describe what you're looking for in plain English.",
  },
  {
    icon: Globe,
    title: "Crawl",
    description:
      "CrawlMind crawls the site(s), renders JavaScript, and extracts clean content — HTML, Markdown, or JSON.",
  },
  {
    icon: MessageSquareText,
    title: "Ask",
    description:
      "Ask your AI assistant anything about the crawled data. Get exact answers, not raw dumps.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            How It Works
          </h2>
          <p className="text-muted-foreground text-lg">
            Three steps. Zero complexity.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="relative group"
            >
              <div className="p-8 rounded-2xl bg-card border border-border/50 hover:border-primary/30 transition-all duration-300 hover:glow-cyan h-full">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5">
                  <step.icon className="w-6 h-6 text-primary" />
                </div>
                <div className="text-sm font-medium text-primary mb-2">
                  Step {i + 1}
                </div>
                <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </div>

              {/* Connector arrow */}
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-1/2 -right-4 w-8 text-center text-muted-foreground/40">
                  →
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
