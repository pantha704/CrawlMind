"use client";

import { motion } from "framer-motion";
import {
  Globe,
  Bot,
  Zap,
  MessageSquare,
  Download,
  Search,
} from "lucide-react";

const features = [
  {
    icon: Globe,
    title: "Multi-URL Crawling",
    description:
      "Crawl 1 or 100 websites in a single job. Set depth, page limits, and wildcard patterns.",
  },
  {
    icon: Bot,
    title: "AI-Powered Intent",
    description:
      "Don't know the URL? Just describe what you're looking for. Our AI finds the right sources automatically.",
  },
  {
    icon: Zap,
    title: "JavaScript Rendering",
    description:
      "Full headless Chrome rendering for SPAs and dynamic content, or ultra-fast static mode for simple sites.",
  },
  {
    icon: MessageSquare,
    title: "Conversational AI Chat",
    description:
      "After crawling, ask AI anything about the data. Follow-up questions, comparisons, summaries — all conversational.",
  },
  {
    icon: Download,
    title: "Export & Integrate",
    description:
      "Download results as Markdown, JSON, or CSV. Pipe directly into your RAG pipeline or vector DB.",
  },
  {
    icon: Search,
    title: "Search Scope Control",
    description:
      "Include/exclude URL patterns, control crawl depth, set modifiedSince for incremental crawls.",
  },
];

export function FeatureGrid() {
  return (
    <section className="py-24 px-6 bg-secondary/30">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Everything you need to{" "}
            <span className="gradient-text">own your data</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            Powerful crawling features wrapped in a simple interface.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="p-6 rounded-xl bg-card/50 border border-border/40 hover:border-primary/20 transition-all duration-300 group"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <feature.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
