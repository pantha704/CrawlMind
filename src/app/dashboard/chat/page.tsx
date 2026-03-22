"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Send,
  Loader2,
  Bot,
  User,
  Sparkles,
  Brain,
  ChevronRight,
  Trash2,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useChat, Chat } from "@ai-sdk/react";
import { DefaultChatTransport, UIMessage } from "ai";

const STORAGE_KEY = (jobId: string) => `crawlmind_global_chat_${jobId}`;

function loadMessages(jobId: string): UIMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY(jobId));
    return raw ? (JSON.parse(raw) as UIMessage[]) : [];
  } catch {
    return [];
  }
}

function saveMessages(jobId: string, messages: UIMessage[]) {
  try {
    localStorage.setItem(STORAGE_KEY(jobId), JSON.stringify(messages));
  } catch {
    // storage full — ignore
  }
}

interface CrawlJob {
  id: string;
  query: string;
  status: string;
  pagesCrawled: number;
  createdAt: string;
}

export default function AIChatPage() {
  const [input, setInput] = useState("");
  const [jobs, setJobs] = useState<CrawlJob[]>([]);
  const [selectedJob, setSelectedJob] = useState<string>("none");
  const scrollRef = useRef<HTMLDivElement>(null);

  const chat = useMemo(
    () =>
      new Chat({
        transport: new DefaultChatTransport({
          api: "/api/chat",
          body: { jobId: selectedJob },
        }),
      }),
    [selectedJob]
  );

  const { messages, sendMessage, status, setMessages } = useChat({ chat });
  const loading = status === "submitted" || status === "streaming";

  // 1. Load history once when job changes
  useEffect(() => {
    const saved = loadMessages(selectedJob);
    if (saved.length > 0) {
      setMessages(saved);
    } else {
      setMessages([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedJob]); // depend on selectedJob, not setMessages

  // 2. Persist whenever messages change significantly
  useEffect(() => {
    if (messages.length > 0) {
      saveMessages(selectedJob, messages);
    }
  }, [selectedJob, messages]);

  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch("/api/crawl/recent");
      const data = await res.json();
      setJobs(data.crawls || []);
    } catch {
      /* empty */
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle <think> blocks and markdown
  const renderMessageContent = (textContent: string) => {
    const thinkStart = textContent.indexOf("<think>");
    if (thinkStart === -1) {
      return (
        <div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:p-0">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {textContent}
          </ReactMarkdown>
        </div>
      );
    }

    const thinkEnd = textContent.indexOf("</think>");
    let think = "";
    let content = "";
    let isThinking = false;

    if (thinkEnd === -1) {
      // Still streaming think block
      think = textContent.substring(thinkStart + 7);
      content = textContent.substring(0, thinkStart);
      isThinking = true;
    } else {
      think = textContent.substring(thinkStart + 7, thinkEnd);
      content = textContent.substring(0, thinkStart) + textContent.substring(thinkEnd + 8);
    }

    return (
      <div className="flex flex-col gap-2">
        {think && (
          <details className="group border border-border/50 rounded-lg bg-secondary/10 mt-1 mb-2">
            <summary className="flex items-center gap-2 p-2 px-3 text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer list-none [&::-webkit-details-marker]:hidden">
              <Brain className={`w-3.5 h-3.5 ${isThinking ? 'animate-pulse text-primary' : ''}`} />
              <span className="group-open:hidden">{isThinking ? 'Thinking...' : 'Thought Process'}</span>
              <span className="hidden group-open:inline">Hide Thought Process</span>
              <ChevronRight className="w-3.5 h-3.5 ml-auto transition-transform group-open:rotate-90" />
            </summary>
            <div className="p-3 pt-1 text-xs text-muted-foreground/80 whitespace-pre-wrap font-mono border-t border-border/10">
              {think.trim()}
            </div>
          </details>
        )}
        {content.trim() && (
          <div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:p-0 prose-pre:bg-secondary/50 prose-pre:border prose-pre:border-border/50">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {content.trim()}
            </ReactMarkdown>
          </div>
        )}
      </div>
    );
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMessage = input.trim();
    setInput("");
    sendMessage({ text: userMessage });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-border/50 gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            AI Chat
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Ask questions about your crawl data or the web in general
          </p>
        </div>
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <Button
              variant="ghost"
              onClick={() => {
                setMessages([]);
                localStorage.removeItem(STORAGE_KEY(selectedJob));
              }}
              className="h-10 px-3 text-muted-foreground hover:text-destructive shrink-0"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear
            </Button>
          )}
          <Select value={selectedJob} onValueChange={(v) => { if (v) setSelectedJob(v); }}>
            <SelectTrigger className="w-full sm:w-[280px] bg-card border-border/50">
              <SelectValue placeholder="Select a crawl for context..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No crawl context</SelectItem>
              {jobs.map((job) => (
                <SelectItem key={job.id} value={job.id}>
                  <span className="truncate block max-w-[220px]">
                    {job.query}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 py-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
              <Bot className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-semibold mb-2">
              What would you like to analyze?
            </h2>
            <p className="text-muted-foreground text-sm max-w-md">
              Select a crawl job for context, or ask me anything about web
              scraping, data extraction, or your crawl results.
            </p>
            <div className="flex flex-wrap gap-2 mt-6 max-w-lg justify-center">
              {[
                "Summarize my latest crawl",
                "Extract all email addresses",
                "Find pricing information",
                "Compare two pages",
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => setInput(suggestion)}
                  className="px-3 py-1.5 rounded-full bg-card border border-border/50 text-xs text-muted-foreground hover:text-foreground hover:border-border transition-all"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4 max-w-3xl mx-auto">
            {messages.map((msg) => {
              const textContent = msg.parts
                ? msg.parts
                    .filter((p) => p.type === "text")
                    .map((p) => (p as { type: "text"; text: string }).text)
                    .join("")
                : (msg as unknown as { content?: string }).content || "";

              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-3 ${
                    msg.role === "user" ? "justify-end" : ""
                  }`}
                >
                  {msg.role === "assistant" && (
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                      <Bot className="w-4 h-4 text-primary" />
                    </div>
                  )}
                  <div
                    className={`max-w-[90%] sm:max-w-[80%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-card border border-border/50 overflow-x-auto"
                    }`}
                  >
                    {msg.role === "user" ? (
                      <p className="whitespace-pre-wrap">{textContent}</p>
                    ) : (
                      renderMessageContent(textContent)
                    )}
                  </div>
                  {msg.role === "user" && (
                    <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center shrink-0 mt-1">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </motion.div>
              );
            })}
            
            {loading && status !== "streaming" && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
                <div className="bg-card border border-border/50 rounded-xl px-4 py-3">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                </div>
              </div>
            )}
            <div ref={scrollRef} />
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="pt-4 border-t border-border/50">
        <div className="flex gap-2 max-w-3xl mx-auto">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything about your crawl data..."
            className="min-h-[48px] max-h-[120px] resize-none bg-card border-border/50 text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <Button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            size="icon"
            className="h-12 w-12 shrink-0 glow-cyan"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
