"use client";

import { useRef, useEffect, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, Loader2, Bot, User, Trash2 } from "lucide-react";

interface AiChatPanelProps {
  jobId: string;
}

export function AiChatPanel({ jobId }: AiChatPanelProps) {
  // scrollable messages container
  const scrollRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState("");

  const { messages, sendMessage, status, setMessages } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: { jobId },
    }),
  });

  // 'submitted' = request sent, 'streaming' = response coming in
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
  };

  // Auto-scroll to the very bottom whenever messages change
  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, status]);

  return (
    <div className="flex flex-col h-[400px] sm:h-[600px] rounded-xl border border-border/50 bg-card overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/50 bg-card shrink-0">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Bot className="w-3.5 h-3.5" />
          <span>Session only — history resets on page reload</span>
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

      {/* Messages — plain div with overflow-y-auto so imperative scroll works */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
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
              // Extract text content from parts array (ai@6 format)
              const textContent = msg.parts
                .filter((p) => p.type === "text")
                .map((p) => (p as { type: "text"; text: string }).text)
                .join("");

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

            {/* Loading indicator while AI is responding */}
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

      {/* Input */}
      <form
        onSubmit={onSubmit}
        className="border-t border-border/50 p-3 sm:p-4 flex gap-2 sm:gap-3 shrink-0"
      >
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask anything about the crawled data..."
          className="min-h-[44px] max-h-[120px] resize-none bg-secondary/50"
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
          className="shrink-0 h-11 w-11"
        >
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </div>
  );
}
