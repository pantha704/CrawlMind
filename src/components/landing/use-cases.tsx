"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GraduationCap, Code, BarChart3, PenTool } from "lucide-react";

const useCases = [
  {
    id: "researchers",
    icon: GraduationCap,
    label: "Researchers",
    title: "Deep Research & Synthesis",
    description:
      "Crawl academic sites, news portals, government databases. Ask AI to synthesize findings across 50 pages in one query.",
    bullets: [
      "Cross-reference multiple sources automatically",
      "Get AI summaries with citations",
      "Export structured research notes",
    ],
  },
  {
    id: "developers",
    icon: Code,
    label: "Developers / RAG",
    title: "RAG Pipeline Fuel",
    description:
      "Extract Markdown from docs sites. Feed clean content into your vector database. Incremental crawls keep your KB fresh.",
    bullets: [
      "Clean Markdown output optimized for embeddings",
      "Incremental crawls with modifiedSince",
      "JSON export for direct pipeline integration",
    ],
  },
  {
    id: "business",
    icon: BarChart3,
    label: "Business Intel",
    title: "Competitive Intelligence",
    description:
      "Monitor competitor pricing pages, product changelogs, job boards. Get AI summaries of what changed.",
    bullets: [
      "Track pricing and product page changes",
      "AI-powered change detection summaries",
      "Export reports for stakeholders",
    ],
  },
  {
    id: "content",
    icon: PenTool,
    label: "Content Creators",
    title: "Research & Create Faster",
    description:
      "Research topics across multiple sources. Get AI-generated briefs. Export structured notes.",
    bullets: [
      "Multi-source topic research in minutes",
      "AI-generated content briefs",
      "Structured note export for writing tools",
    ],
  },
];

export function UseCases() {
  const [active, setActive] = useState("researchers");
  const activeCase = useCases.find((uc) => uc.id === active)!;

  return (
    <section className="py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Built for every workflow
          </h2>
          <p className="text-muted-foreground text-lg">
            From academic research to production pipelines.
          </p>
        </motion.div>

        {/* Tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {useCases.map((uc) => (
            <button
              key={uc.id}
              onClick={() => setActive(uc.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                active === uc.id
                  ? "bg-primary text-primary-foreground shadow-lg"
                  : "bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <uc.icon className="w-4 h-4" />
              {uc.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="p-8 rounded-2xl bg-card border border-border/50"
          >
            <h3 className="text-2xl font-bold mb-3">{activeCase.title}</h3>
            <p className="text-muted-foreground mb-6 text-lg">
              {activeCase.description}
            </p>
            <ul className="space-y-3">
              {activeCase.bullets.map((bullet) => (
                <li key={bullet} className="flex items-start gap-3 text-sm">
                  <span className="text-primary mt-0.5">✓</span>
                  <span className="text-muted-foreground">{bullet}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
