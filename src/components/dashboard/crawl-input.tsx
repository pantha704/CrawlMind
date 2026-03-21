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
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

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
  const [planLimits, setPlanLimits] = useState<PlanLimits | null>(null);

  // Advanced params
  const [depth, setDepth] = useState(2);
  const [limit, setLimit] = useState(30);
  const [format, setFormat] = useState("markdown");
  const [jsRender, setJsRender] = useState(false);
  const [includeSubdomains, setIncludeSubdomains] = useState(true);
  const [includeExternalLinks, setIncludeExternalLinks] = useState(true);

  // Deep Advanced
  const [source, setSource] = useState("all");
  const [excludePatterns, setExcludePatterns] = useState("");
  const [maxAge, setMaxAge] = useState(86400); // 24 hours
  const [modifiedSince, setModifiedSince] = useState("");

  // Auto-detect input type
  const detectedMode = useMemo(() => {
    return looksLikeUrl(query) ? "url" : "ai";
  }, [query]);

  // Fetch plan limits on mount
  useEffect(() => {
    async function fetchLimits() {
      try {
        const res = await fetch("/api/user/usage");
        if (res.ok) {
          const data = await res.json();
          setPlanLimits(data);
          setLimit(Math.min(30, data.maxPages));
        }
      } catch {
        // Fallback: Spark defaults
      }
    }
    fetchLimits();
  }, []);

  const maxPages = planLimits?.maxPages ?? 30;
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
      const res = await fetch("/api/crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: query.trim(),
          inputType: detectedMode === "url" ? "URL" : "PLAINTEXT",
          depth,
          limit: Math.min(limit, maxPages),
          format,
          render: jsRender,
          includeSubdomains,
          includeExternalLinks,
          source,
          excludePatterns: excludePatterns.trim() ? excludePatterns.split(",").map(p => p.trim()) : undefined,
          maxAge: maxAge,
          modifiedSince: modifiedSince ? new Date(modifiedSince).toISOString() : undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to start crawl");
      }

      toast.success("Crawl started! Watch the progress below.");
      setQuery("");
      onCrawlStarted?.();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
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
          Advanced Parameters
        </button>
        <Button
          onClick={handleSubmit}
          disabled={loading || !query.trim()}
          className="glow-cyan"
          size="lg"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Starting...
            </>
          ) : (
            <>
              <Rocket className="w-4 h-4 mr-2" />
              Start Crawl
            </>
          )}
        </Button>
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
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
