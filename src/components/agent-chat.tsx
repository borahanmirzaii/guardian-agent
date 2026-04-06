"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, isToolUIPart } from "ai";
import { useState, useRef, useEffect } from "react";
import { Send, Loader2, Bot, User, Shield, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const SUGGESTIONS = [
  "Scan my GitHub repos for exposed secrets",
  "Check my Gmail for suspicious forwarding rules",
  "List all open security findings",
  "Scan all connected accounts and summarize threats",
];

export function AgentChat() {
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: "/api/agent" }),
  });
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const isStreaming = status === "streaming" || status === "submitted";

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;
    sendMessage({ text: input });
    setInput("");
  }

  function handleSuggestion(text: string) {
    if (isStreaming) return;
    sendMessage({ text });
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 pb-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500">
              <Bot className="h-8 w-8" />
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-xl font-semibold">Guardian Agent</h2>
              <p className="text-sm text-muted-foreground max-w-md">
                I can scan your connected accounts for security threats and take
                protective action with your approval.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg w-full">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSuggestion(s)}
                  className="rounded-lg border border-border bg-card px-4 py-3 text-sm text-left hover:bg-accent transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}
            >
              {msg.role === "assistant" && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
                  <Bot className="h-4 w-4" />
                </div>
              )}
              <div
                className={`max-w-[80%] space-y-2 ${
                  msg.role === "user"
                    ? "rounded-2xl rounded-br-md bg-primary text-primary-foreground px-4 py-2.5"
                    : ""
                }`}
              >
                {msg.parts.map((part, i) => {
                  if (part.type === "text" && part.text) {
                    return (
                      <div
                        key={i}
                        className="text-sm whitespace-pre-wrap leading-relaxed"
                      >
                        {part.text}
                      </div>
                    );
                  }
                  if (isToolUIPart(part)) {
                    const toolName = part.type.replace(/^tool-/, "");
                    const hasOutput = part.state === "output-available";
                    return (
                      <ToolCallDisplay
                        key={i}
                        name={toolName}
                        state={part.state}
                        args={part.input as Record<string, unknown>}
                        result={hasOutput ? part.output : undefined}
                      />
                    );
                  }
                  return null;
                })}
              </div>
              {msg.role === "user" && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <User className="h-4 w-4" />
                </div>
              )}
            </div>
          ))
        )}

        {isStreaming && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="flex gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
              <Bot className="h-4 w-4" />
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Thinking...
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2 pt-4 border-t border-border">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask Guardian to scan, analyze, or remediate..."
          className="flex-1 rounded-lg border border-border bg-card px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          disabled={isStreaming}
        />
        <Button type="submit" disabled={!input.trim() || isStreaming} size="sm">
          {isStreaming ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </form>
    </div>
  );
}

function ToolCallDisplay({
  name,
  state,
  args,
  result,
}: {
  name: string;
  state: string;
  args: Record<string, unknown>;
  result?: unknown;
}) {
  const toolLabels: Record<string, string> = {
    scanGitHub: "Scanning GitHub repositories",
    scanGoogle: "Scanning Gmail forwarding rules",
    listFindings: "Listing security findings",
    remediateFinding: "Executing remediation",
  };

  const label = toolLabels[name] ?? name;
  const isRunning = state === "input-available" || state === "input-streaming";
  const isDone = state === "output-available";
  const resultData = result as Record<string, unknown> | undefined;

  return (
    <div className="rounded-lg border border-border bg-muted/50 p-3 text-xs space-y-2">
      <div className="flex items-center gap-2">
        {isRunning ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-500" />
        ) : (
          <Wrench className="h-3.5 w-3.5 text-emerald-500" />
        )}
        <span className="font-medium">{label}</span>
        {name === "remediateFinding" && (
          <Badge
            variant="outline"
            className="border-amber-500/30 text-amber-500 text-[10px]"
          >
            <Shield className="h-2.5 w-2.5 mr-1" />
            Step-Up Auth
          </Badge>
        )}
        {isDone && (
          <Badge
            variant="outline"
            className="border-emerald-500/30 text-emerald-500 text-[10px]"
          >
            Done
          </Badge>
        )}
      </div>
      {isDone && resultData && (
        <div className="text-muted-foreground">
          {"findings_count" in resultData && (
            <span>
              Found {String(resultData.findings_count)} finding(s)
            </span>
          )}
          {"result" in resultData && (
            <span>{String(resultData.result)}</span>
          )}
          {"error" in resultData && (
            <span className="text-red-400">{String(resultData.error)}</span>
          )}
          {Array.isArray(resultData) && (
            <span>{resultData.length} finding(s) returned</span>
          )}
        </div>
      )}
    </div>
  );
}
