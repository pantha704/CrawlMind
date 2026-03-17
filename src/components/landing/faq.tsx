"use client";

import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    q: "Is web scraping legal?",
    a: "CrawlMind respects all robots.txt directives and rate limits. We don't bypass CAPTCHAs, login walls, or access restricted content. You're responsible for complying with the terms of service of websites you crawl. We provide the tool — you choose how to use it responsibly.",
  },
  {
    q: "Does CrawlMind bypass anti-bot protections?",
    a: "No. CrawlMind uses Cloudflare's Browser Rendering service which operates standard headless Chrome. It does not bypass CAPTCHAs, Cloudflare Bot Management, or other anti-bot systems. If a page blocks headless browsers, we respect that.",
  },
  {
    q: "What happens to my crawled data?",
    a: "Your data is stored securely and is only accessible to you. Free tier data is retained for 7 days. Pro and Scale users get 90 and 365 days respectively. You can delete any crawl result at any time. We never sell or share your crawled content.",
  },
  {
    q: "Can I use this for my RAG pipeline?",
    a: "Absolutely — that's one of our core use cases. Request Markdown output format, export via JSON, and pipe directly into your vector database. Scale tier users can set up webhooks to automatically push results to their pipeline.",
  },
  {
    q: "What AI model powers the analysis?",
    a: "We use state-of-the-art LLMs from NVIDIA NIM for deep analysis, with Groq-powered models as a fast fallback. The AI receives the crawled page content as context and answers your questions with full awareness of the extracted data.",
  },
  {
    q: "What's the difference between static and rendered crawling?",
    a: "Static crawling (render: off) does a simple HTTP fetch — fast, cheap, and great for blogs, docs, and simple pages. Rendered crawling (render: on) spins up a headless Chrome browser to execute JavaScript — necessary for SPAs, dynamic dashboards, and modern web apps.",
  },
];

export function FAQ() {
  return (
    <section className="py-24 px-6">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Frequently Asked Questions
          </h2>
        </motion.div>

        <Accordion className="space-y-3">
          {faqs.map((faq, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
            >
              <AccordionItem
                value={`faq-${i}`}
                className="border border-border/50 rounded-xl px-6 bg-card/30"
              >
                <AccordionTrigger className="text-left font-medium hover:no-underline">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            </motion.div>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
