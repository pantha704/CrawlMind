import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export const nvidia = createOpenAICompatible({
  name: "nvidia",
  baseURL: "https://integrate.api.nvidia.com/v1",
  headers: {
    Authorization: `Bearer ${process.env.NVIDIA_NIM_API_KEY}`,
  },
});

export const groq = createOpenAICompatible({
  name: "groq",
  baseURL: "https://api.groq.com/openai/v1",
  headers: {
    Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
  },
});

// Primary model for AI chat (powerful reasoning)
export const chatModel = nvidia("nvidia/llama-3.3-nemotron-super-49b-v1.5");

// Fast model for URL resolution and classification (Groq for speed)
export const fastModel = groq("llama-3.3-70b-versatile");

// Tier limits
export const TIER_LIMITS = {
  SPARK: {
    crawlsPerDay: 5,
    maxPages: 100,
    aiQueriesPerCrawl: 3,
    renderAllowed: false,
    historyDays: 7,
  },
  PRO: {
    crawlsPerDay: 25,
    maxPages: 500,
    aiQueriesPerCrawl: Infinity,
    renderAllowed: true,
    historyDays: 90,
  },
  SCALE: {
    crawlsPerDay: 150,
    maxPages: 5000,
    aiQueriesPerCrawl: Infinity,
    renderAllowed: true,
    historyDays: 365,
  },
} as const;
