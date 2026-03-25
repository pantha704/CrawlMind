import { generateText } from "ai";
import { fastModel, nvidia } from "@/lib/ai";

// ---------------------------------------------------------------------------
// Depth tier config
// ---------------------------------------------------------------------------

export const DEPTH_TIERS = {
  QUICK: { label: "⚡ Surface Scan", urls: 5, maxRounds: 1, description: "AI finds 3-5 relevant sources and crawls them" },
  STANDARD: { label: "🔍 Deep Dive", urls: 15, maxRounds: 1, description: "AI finds 10-15 sources across categories and crawls them" },
  RESEARCH: { label: "🧠 Multi-hop Research", urls: 20, maxRounds: 3, description: "AI crawls, reads results, finds gaps, then crawls follow-up sources (2-3 rounds)" },
} as const;

export type DepthLevel = keyof typeof DEPTH_TIERS;

// ---------------------------------------------------------------------------
// Groq: URL Discovery (fast, ~200ms)
// ---------------------------------------------------------------------------

interface DiscoveredUrl {
  url: string;
  reason: string;
  category: string;
}

export async function discoverUrls(
  query: string,
  depth: DepthLevel,
  existingUrls: string[] = []
): Promise<{ urls: DiscoveredUrl[]; error?: string }> {
  const tier = DEPTH_TIERS[depth];
  const excludeClause = existingUrls.length > 0
    ? `\n\nDo NOT include these already-crawled URLs:\n${existingUrls.join("\n")}`
    : "";

  try {
    const { text } = await generateText({
      model: fastModel,
      prompt: `You are a research URL discovery agent. Given the user's topic, generate a JSON array of the most relevant URLs to crawl for comprehensive research.

For each URL, return a JSON object with:
- "url": the full URL (must start with https://)
- "reason": one sentence on why this source is relevant
- "category": one of "docs", "github", "news", "blog", "research", "official"

Rules:
- Prefer primary/official sources over aggregators
- Include diverse domains (not just one site)
- Return exactly ${tier.urls} URLs
- Return ONLY a valid JSON array, no markdown, no explanation${excludeClause}

Topic: ${query}`,
    });

    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return { urls: [], error: "AI returned no valid JSON" };

    const parsed = JSON.parse(jsonMatch[0]) as DiscoveredUrl[];
    return { urls: parsed.filter(u => u.url?.startsWith("http")) };
  } catch (e) {
    console.error("[research] URL discovery failed:", e);
    return { urls: [], error: String(e) };
  }
}

// ---------------------------------------------------------------------------
// NIM: Gap Analysis (multi-hop, Research tier only)
// ---------------------------------------------------------------------------

export async function analyzeGaps(
  query: string,
  crawledContent: string[],
  existingUrls: string[]
): Promise<{ urls: DiscoveredUrl[]; isComprehensive: boolean }> {
  try {
    const contentSummary = crawledContent
      .slice(0, 10)
      .map((c, i) => `[Source ${i + 1}]: ${c.slice(0, 500)}`)
      .join("\n\n");

    const { text } = await generateText({
      model: nvidia("nvidia/llama-3.3-nemotron-super-49b-v1.5"),
      prompt: `You are a research analyst. Analyze the following crawled content for the topic "${query}" and determine:

1. Are there significant knowledge gaps?
2. If yes, suggest 5-10 follow-up URLs to fill those gaps.

Already crawled URLs (do NOT repeat):
${existingUrls.join("\n")}

Crawled content summaries:
${contentSummary}

Respond with a JSON object:
{
  "isComprehensive": true/false,
  "gaps": ["description of gap 1", ...],
  "followUpUrls": [{"url": "...", "reason": "...", "category": "..."}]
}

Return ONLY valid JSON.`,
    });

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { urls: [], isComprehensive: true };

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      urls: (parsed.followUpUrls || []).filter((u: DiscoveredUrl) => u.url?.startsWith("http")),
      isComprehensive: parsed.isComprehensive ?? true,
    };
  } catch (e) {
    console.error("[research] Gap analysis failed:", e);
    return { urls: [], isComprehensive: true };
  }
}

// ---------------------------------------------------------------------------
// NIM: Final Synthesis
// ---------------------------------------------------------------------------

export async function synthesizeResults(
  query: string,
  results: Array<{ url: string; content: string; title?: string }>
): Promise<{ synthesis: string; model: string; error?: string }> {
  const model = "nvidia/llama-3.3-nemotron-super-49b-v1.5";

  try {
    const sourceDocs = results
      .slice(0, 30)
      .map((r, i) => `### Source ${i + 1}: ${r.title || r.url}\nURL: ${r.url}\n\n${r.content.slice(0, 2000)}`)
      .join("\n\n---\n\n");

    const { text } = await generateText({
      model: nvidia(model),
      prompt: `You are a research synthesis expert. Given crawled data from multiple sources on the topic "${query}", produce a comprehensive markdown report.

Structure your report as:
## Executive Summary
Brief overview of findings.

## Key Findings
Organized by theme, with inline citations [Source N].

## Source Analysis
Which sources were most valuable and why.

## Conflicting Viewpoints
Any disagreements between sources (if applicable).

## Recommendations
Actionable next steps based on findings.

---

Sources:
${sourceDocs}`,
    });

    return { synthesis: text, model };
  } catch (e) {
    console.error("[research] Synthesis failed:", e);
    return { synthesis: "", model, error: String(e) };
  }
}

// ---------------------------------------------------------------------------
// Estimate usage
// ---------------------------------------------------------------------------

export function estimateUsage(depth: DepthLevel): { pages: number; sites: number; time: string } {
  const tier = DEPTH_TIERS[depth];
  const avgPagesPerSite = 20;
  const sites = tier.urls;
  const pages = sites * avgPagesPerSite * tier.maxRounds;
  const timeMap = { QUICK: "~30s", STANDARD: "~2min", RESEARCH: "~5min" };
  return { pages, sites, time: timeMap[depth] };
}
