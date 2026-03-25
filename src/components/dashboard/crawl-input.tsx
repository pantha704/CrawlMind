"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  Globe,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Loader2,
  Rocket,
  Info,
  Brain,
  Search,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useRef } from "react";
import { Upload } from "lucide-react";

const DEPTH_TIERS = {
  QUICK: { icon: Zap, label: "Quick", description: "AI finds 3-5 relevant sources and crawls them (~30s)" },
  STANDARD: { icon: Search, label: "Deep Dive", description: "AI finds 10-15 sources across categories and crawls them (~2min)" },
  RESEARCH: { icon: Brain, label: "Research", description: "Multi-hop: crawl → analyze gaps → follow-up crawls, 2-3 rounds (~5min)" },
} as const;

type DepthLevel = keyof typeof DEPTH_TIERS;

function InfoTip({ text }: { text: string }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          render={<Info className="w-3.5 h-3.5 text-muted-foreground/60 hover:text-primary cursor-help transition-colors inline ml-1" />}
        />
        <TooltipContent side="top" className="max-w-[220px] text-xs leading-relaxed">
          {text}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface PlanLimits {
  plan: string;
  maxPages: number;
  allowAI: boolean;
  allowJS: boolean;
  crawlsToday: number;
  maxCrawls: number;
}

interface CrawlInputProps {
  onCrawlStarted?: () => void;
}

function looksLikeUrl(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  // Check each line — if any line starts with http or looks like a domain
  const lines = trimmed.split(/[\n,]+/).map((l) => l.trim()).filter(Boolean);
  return lines.some(
    (line) =>
      line.startsWith("http://") ||
      line.startsWith("https://") ||
      /^[\w-]+\.\w{2,}/.test(line) // e.g. "docs.cloudflare.com"
  );
}

export function CrawlInput({ onCrawlStarted }: CrawlInputProps) {
  const [query, setQuery] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [planLimits, setPlanLimits] = useState<PlanLimits | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // AI Discovery
  const [aiDiscovery, setAiDiscovery] = useState(false);
  const [depthLevel, setDepthLevel] = useState<DepthLevel>("QUICK");

  // Advanced params
  const [depth, setDepth] = useState(2);
  const [limit, setLimit] = useState(20);
  const [format, setFormat] = useState("markdown");
  const [jsRender, setJsRender] = useState(false);
  const [includeSubdomains, setIncludeSubdomains] = useState(true);
  const [includeExternalLinks, setIncludeExternalLinks] = useState(true);

  // Deep Advanced
  const [source, setSource] = useState("all");
  const [excludePatterns, setExcludePatterns] = useState("");
  const [maxAge, setMaxAge] = useState(86400); // 24 hours
  const [modifiedSince, setModifiedSince] = useState("");
  const [crawlPurposes, setCrawlPurposes] = useState<string[]>([]);

  // Auto-detect input type
  const detectedMode = useMemo(() => {
    return looksLikeUrl(query) ? "url" : "ai";
  }, [query]);

  // Whether to use AI Discovery flow
  const useResearchFlow = aiDiscovery || detectedMode === "ai";

  // Fetch plan limits on mount
  useEffect(() => {
    async function fetchLimits() {
      try {
        const res = await fetch("/api/user/usage");
        if (res.ok) {
          const data = await res.json();
          setPlanLimits(data);
          setLimit(prev => Math.min(prev, data.maxPages));
        }
      } catch {
        // Fallback: Spark defaults
      }
    }
    fetchLimits();
  }, []);

  const maxPages = planLimits?.maxPages ?? 100;
  const allowAI = planLimits?.allowAI ?? false;
  const allowJS = planLimits?.allowJS ?? false;

  const handleSubmit = async () => {
    if (!query.trim()) {
      toast.error("Please enter a URL or describe what to crawl");
      return;
    }

    // If AI mode detected but plan doesn't allow it
    if (detectedMode === "ai" && !allowAI) {
      toast.error(
        "AI-powered URL discovery requires Pro plan or higher. Try pasting a direct URL instead."
      );
      return;
    }

    setLoading(true);
    try {
      if (useResearchFlow) {
        // AI Discovery flow → /api/research
        const res = await fetch("/api/research", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: query.trim(),
            depth: depthLevel,
            aiDiscovery: true,
            sourceUrl: detectedMode === "url" ? query.trim().split(/[\n,]+/)[0]?.trim() : undefined,
          }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to start research");
        }

        const data = await res.json();
        toast.success(`AI Research started! Discovering ${data.subJobCount} sources (${DEPTH_TIERS[depthLevel].label})`);
        setQuery("");
        setAiDiscovery(false);
        onCrawlStarted?.();
      } else {
        // Normal crawl flow → /api/crawl
        const res = await fetch("/api/crawl", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: query.trim(),
            inputType: "URL",
            depth,
            limit: Math.min(limit, maxPages),
            format,
            render: jsRender,
            includeSubdomains,
            includeExternalLinks,
            source,
            excludePatterns: excludePatterns.trim() ? excludePatterns.split(",").map(p => p.trim()) : undefined,
            maxAge: maxAge,
            modifiedSince: modifiedSince || undefined,
            crawlPurposes: crawlPurposes.length > 0 ? crawlPurposes : undefined,
          }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to start crawl");
        }

        toast.success("Crawl started! Watch the progress below.");
        setQuery("");
        onCrawlStarted?.();
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const text = await file.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error("Invalid JSON file");
      }

      const res = await fetch("/api/crawl/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to import crawl");

      toast.success("Crawl imported successfully!");
      if (fileInputRef.current) fileInputRef.current.value = "";
      
      // Redirect directly to the imported job
      window.location.href = `/dashboard/jobs/${result.jobId}`;
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to import crawl");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Smart input — unified */}
      <div className="relative">
        <Textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Paste a URL to crawl or describe what you're looking for..."
          className="min-h-[100px] resize-none bg-card border-border/50 focus:border-primary pr-4 text-base"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              handleSubmit();
            }
          }}
        />
        <div className="absolute bottom-3 right-3 flex items-center gap-2">
          {query.trim() && (
            <Badge
              variant="outline"
              className={`text-[10px] transition-all ${
                detectedMode === "url"
                  ? "text-primary border-primary/30"
                  : "text-amber-400 border-amber-400/30"
              }`}
            >
              {detectedMode === "url" ? (
                <><Globe className="w-3 h-3 mr-1" /> URL detected</>
              ) : (
                <><Sparkles className="w-3 h-3 mr-1" /> AI discovery{!allowAI && " (Pro)"}</>
              )}
            </Badge>
          )}
          <span className="text-xs text-muted-foreground">⌘+Enter</span>
        </div>
      </div>

      {/* AI Discovery Section */}
      <AnimatePresence>
        {query.trim() && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-4 p-3 rounded-lg bg-card/50 border border-border/30">
              {/* AI Discovery Toggle */}
              <div className="flex items-center gap-2">
                <Switch
                  checked={useResearchFlow}
                  onCheckedChange={(checked) => setAiDiscovery(checked)}
                  disabled={detectedMode === "ai"}
                />
                <Label className="text-sm font-medium flex items-center gap-1.5 cursor-pointer">
                  <Brain className="w-4 h-4 text-purple-400" />
                  AI Discovery
                  <InfoTip text={detectedMode === "url"
                    ? "Find and crawl related sites for deeper research on this URL"
                    : "AI will find the best sources and crawl them for you"
                  } />
                </Label>
              </div>

              {/* Depth Selector */}
              {useResearchFlow && (
                <div className="flex items-center gap-1.5 ml-auto">
                  {(Object.entries(DEPTH_TIERS) as [DepthLevel, typeof DEPTH_TIERS[DepthLevel]][]).map(([key, tier]) => {
                    const Icon = tier.icon;
                    const isActive = depthLevel === key;
                    return (
                      <TooltipProvider key={key}>
                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <button
                                onClick={() => setDepthLevel(key)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                  isActive
                                    ? "bg-primary text-primary-foreground shadow-sm"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                }`}
                              >
                                <Icon className="w-3.5 h-3.5" />
                                {tier.label}
                              </button>
                            }
                          />
                          <TooltipContent side="bottom" className="max-w-[260px] text-xs leading-relaxed">
                            {tier.description}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Actions row */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {showAdvanced ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
          {useResearchFlow ? "Crawl Parameters" : "Advanced Parameters"}
        </button>
        <div className="flex items-center gap-3">
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept=".json"
            onChange={handleImport}
          />
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading || importing}
            className="border-primary/20 text-primary hover:bg-primary/10"
            size="lg"
          >
            {importing ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Upload className="w-4 h-4 mr-2" />
            )}
            Import Crawl
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !query.trim()}
            className="glow-cyan"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {useResearchFlow ? "Researching..." : "Starting..."}
              </>
            ) : (
              <>
                {useResearchFlow ? (
                  <><Brain className="w-4 h-4 mr-2" />Start Research</>
                ) : (
                  <><Rocket className="w-4 h-4 mr-2" />Start Crawl</>
                )}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Advanced panel */}
      <AnimatePresence>
        {showAdvanced && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="space-y-4 p-4 rounded-xl bg-card border border-border/50">
              {/* Row 1: Core params */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {/* Depth */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground flex items-center">
                    Crawl Depth: {depth}
                    <InfoTip text="How many link levels deep the crawler will follow from the starting URL. Note: If depth is 2 or higher, consider turning on 'Follow External Links' to reach those pages." />
                  </Label>
                  <Slider
                    value={[depth]}
                    onValueChange={(v) => setDepth(Array.isArray(v) ? v[0] : v)}
                    min={1}
                    max={10}
                    step={1}
                  />
                </div>

                {/* Page limit */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground flex items-center">
                    Max Pages
                    <span className="text-primary ml-1">(max {maxPages.toLocaleString()})</span>
                    <InfoTip text="Maximum number of pages to crawl. The crawler stops after reaching this limit, even if there are more links to follow." />
                  </Label>
                  <Input
                    type="number"
                    value={limit}
                    onChange={(e) => setLimit(Math.min(Number(e.target.value), maxPages))}
                    min={1}
                    max={maxPages}
                    className="bg-secondary/50"
                  />
                </div>

                {/* Format */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground flex items-center">
                    Output Format
                    <InfoTip text="The format of crawled page content. Markdown is clean and readable, HTML preserves structure, Plaintext strips all formatting." />
                  </Label>
                  <Select value={format} onValueChange={(v) => { if (v) setFormat(v); }}>
                    <SelectTrigger className="bg-secondary/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="markdown">Markdown</SelectItem>
                      <SelectItem value="html">HTML</SelectItem>
                      <SelectItem value="plaintext">Plaintext</SelectItem>
                      <SelectItem value="readableHTML">Readable HTML</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* JS Rendering */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground flex items-center">
                    JS Rendering
                    <InfoTip text="Enable to render JavaScript-heavy pages (SPAs, React sites). Slower but captures dynamically loaded content. Requires Pro plan." />
                  </Label>
                  <div className="flex items-center gap-2 pt-1">
                    <Switch
                      checked={jsRender}
                      onCheckedChange={(v) => {
                        if (v && !allowJS) {
                          toast.error("JS rendering requires Pro plan or higher");
                          return;
                        }
                        setJsRender(v);
                      }}
                      disabled={!allowJS}
                    />
                    <span className="text-xs text-muted-foreground">
                      {jsRender ? "On" : "Off"}
                    </span>
                    {!allowJS && (
                      <Badge variant="outline" className="text-[10px]">
                        Pro
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Row 2: Scope controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border/30">
                {/* Include Subdomains */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground flex items-center">
                    Include Subdomains
                    <InfoTip text="When enabled, the crawler will also follow links to subdomains of the target site (e.g. docs.example.com when crawling example.com)." />
                  </Label>
                  <div className="flex items-center gap-2 pt-1">
                    <Switch
                      checked={includeSubdomains}
                      onCheckedChange={setIncludeSubdomains}
                    />
                    <span className="text-xs text-muted-foreground">
                      {includeSubdomains ? "On" : "Off"}
                    </span>
                  </div>
                </div>

                {/* Include External Links */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground flex items-center">
                    Follow External Links
                    <InfoTip text="When enabled, the crawler will follow links to other domains found on the page. Useful for research but may result in unrelated content." />
                  </Label>
                  <div className="flex items-center gap-2 pt-1">
                    <Switch
                      checked={includeExternalLinks}
                      onCheckedChange={setIncludeExternalLinks}
                    />
                    <span className="text-xs text-muted-foreground">
                      {includeExternalLinks ? "On" : "Off"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Row 3: Deep advanced controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-2 border-t border-border/30">
                {/* Source */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground flex items-center">
                    Crawl Source
                    <InfoTip text="How the crawler finds new URLs. 'All' uses links and sitemaps. 'Links' only follows <a> tags. 'Sitemaps' only uses XML sitemaps." />
                  </Label>
                  <Select value={source} onValueChange={(v) => { if (v) setSource(v); }}>
                    <SelectTrigger className="bg-secondary/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All (Links & Sitemaps)</SelectItem>
                      <SelectItem value="links">Links Only</SelectItem>
                      <SelectItem value="sitemaps">Sitemaps Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Exclude Patterns */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground flex items-center">
                    Exclude Patterns
                    <InfoTip text="Comma-separated wildcard patterns. The crawler will explicitly skip these URLs (e.g. **/blog/**, **/*.pdf)." />
                  </Label>
                  <Input
                    type="text"
                    placeholder="**/blog/**, **/*.pdf"
                    value={excludePatterns}
                    onChange={(e) => setExcludePatterns(e.target.value)}
                    className="bg-secondary/50"
                  />
                </div>

                {/* Max Cache Age */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground flex items-center">
                    Max Cache Age (seconds)
                    <InfoTip text="How long the crawler can use a previously cached version of a page before forcibly re-fetching it from the server." />
                  </Label>
                  <Input
                    type="number"
                    value={maxAge}
                    onChange={(e) => setMaxAge(Number(e.target.value))}
                    min={0}
                    max={604800} // 7 days
                    className="bg-secondary/50"
                  />
                </div>

                {/* Modified Since */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground flex items-center">
                    Modified Since
                    <InfoTip text="Only crawl pages that have changed since this date. Great for setting up incremental/recurring crawls." />
                  </Label>
                  <Input
                    type="datetime-local"
                    value={modifiedSince}
                    onChange={(e) => setModifiedSince(e.target.value)}
                    className="bg-secondary/50"
                  />
                </div>

                {/* Crawl Purposes */}
                <div className="space-y-2 sm:col-span-2 md:col-span-4">
                  <Label className="text-xs text-muted-foreground flex items-center">
                    Crawl Purposes
                    <InfoTip text="Declare your crawl intent for Content Signals compliance. Sites can use these to control access. Leave empty if unsure." />
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {(["search", "ai-input", "ai-train"] as const).map((purpose) => (
                      <button
                        key={purpose}
                        type="button"
                        onClick={() => {
                          setCrawlPurposes((prev) =>
                            prev.includes(purpose)
                              ? prev.filter((p) => p !== purpose)
                              : [...prev, purpose]
                          );
                        }}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors border ${
                          crawlPurposes.includes(purpose)
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-secondary/50 text-muted-foreground border-border/50 hover:border-primary/50"
                        }`}
                      >
                        {purpose}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
