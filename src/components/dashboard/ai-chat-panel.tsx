"use client";

import { useRef, useEffect, useState, useMemo } from "react";
import { useChat, Chat } from "@ai-sdk/react";
import { DefaultChatTransport, UIMessage } from "ai";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, Loader2, Bot, User, Trash2 } from "lucide-react";

interface AiChatPanelProps {
  jobId: string;
}

const STORAGE_KEY = (jobId: string) => `crawlmind_chat_${jobId}`;

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

export function AiChatPanel({ jobId }: AiChatPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState("");

  const chat = useMemo(
    () =>
      new Chat({
        transport: new DefaultChatTransport({
          api: "/api/chat",
          body: { jobId },
        }),
      }),
    [jobId]
  );

  const { messages, sendMessage, status, setMessages } = useChat({ chat });

  // 1. Load history once on mount (avoids Next.js SSR hydration clash)
  useEffect(() => {
    const saved = loadMessages(jobId);
    if (saved.length > 0) {
      setMessages(saved);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]); // we don't depend on setMessages to prevent re-runs

  // 2. Persist whenever messages change and there are messages
  useEffect(() => {
    if (messages.length > 0) {
      saveMessages(jobId, messages);
    }
  }, [jobId, messages]);

  const isLoading = status === "submitted" || status === "streaming";

  const onSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;
    const text = input;
    setInput("");
    sendMessage({ text });
  };

  const onClear = () => {
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY(jobId));
  };

  // Auto-scroll to bottom
  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, status]);

  return (
    // We use ABSOLUTE POSITIONING to absolutely guarantee the bounds
    <div 
      className="border border-border/50 rounded-xl bg-card overflow-hidden w-full relative"
      style={{ height: "650px", maxHeight: "calc(100vh - 200px)" }}
    >
      {/* 1. Header (Fixed Height) */}
      <div className="absolute top-0 left-0 right-0 h-14 flex items-center justify-between px-4 border-b border-border/50 bg-card z-10">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Bot className="w-3.5 h-3.5" />
          <span>History saved per browser — full context sent each message</span>
        </div>
        {messages.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="h-7 px-2 gap-1.5 text-xs text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="w-3 h-3" />
            Clear
          </Button>
        )}
      </div>

      {/* 2. Messages (Absolute Bounds) */}
      <div
        ref={scrollRef}
        className="absolute top-14 left-0 right-0 bottom-[72px] overflow-y-auto p-4 space-y-4 bg-background/50"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-16">
            <Bot className="w-12 h-12 text-primary/30 mb-4" />
            <h3 className="font-medium text-lg mb-2">Ask AI about this crawl</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              I&apos;ve analyzed the crawled data. Ask me anything — summaries,
              specific data points, comparisons, or any question about the content.
            </p>
            <div className="flex flex-wrap gap-2 mt-6 max-w-md justify-center">
              {[
                "Summarize the key findings",
                "What are the main topics covered?",
                "Extract all links mentioned",
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => setInput(suggestion)}
                  className="px-3 py-1.5 rounded-lg bg-secondary text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg) => {
              const textContent = msg.parts
                ? msg.parts
                    .filter((p) => p.type === "text")
                    .map((p) => (p as { type: "text"; text: string }).text)
                    .join("")
                : (msg as unknown as { content?: string }).content || "";

              return (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {msg.role === "assistant" && (
                    <Avatar className="w-8 h-8 shrink-0 mt-0.5">
                      <AvatarFallback className="bg-primary/20 text-primary text-xs">
                        <Bot className="w-4 h-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={`max-w-[90%] sm:max-w-[80%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary/50 text-foreground"
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{textContent}</div>
                  </div>
                  {msg.role === "user" && (
                    <Avatar className="w-8 h-8 shrink-0 mt-0.5">
                      <AvatarFallback className="bg-secondary text-muted-foreground text-xs">
                        <User className="w-4 h-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              );
            })}

            {isLoading && (
              <div className="flex gap-3">
                <Avatar className="w-8 h-8 shrink-0">
                  <AvatarFallback className="bg-primary/20 text-primary text-xs">
                    <Bot className="w-4 h-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="bg-secondary/50 rounded-xl px-4 py-3">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* 3. Input Form (Fixed Height at Bottom) */}
      <form
        onSubmit={onSubmit}
        className="absolute bottom-0 left-0 right-0 h-[72px] border-t border-border/50 p-3 flex gap-2 sm:gap-3 bg-card z-10"
      >
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask anything about the crawled data..."
          className="h-[48px] min-h-[48px] max-h-[48px] resize-none bg-secondary/50"
          rows={1}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSubmit(e as unknown as React.FormEvent);
            }
          }}
        />
        <Button
          type="submit"
          disabled={isLoading || !input?.trim()}
          size="icon"
          className="shrink-0 h-12 w-12"
        >
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </div>
  );
}
