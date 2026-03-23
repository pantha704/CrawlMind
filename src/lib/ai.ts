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

// Tier limits — re-exported from centralized config
export { PLANS as TIER_LIMITS } from "@/config/plans";
