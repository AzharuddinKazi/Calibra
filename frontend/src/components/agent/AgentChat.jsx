import { useState, useRef, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Send, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import ConfirmGenerate from "./ConfirmGenerate";

function formatTime(date) {
  return new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function AgentChat({
  messages,
  isLoading,
  readyToGenerate,
  config,
  suggestions = [],
  onSend,
  onGenerate,
}) {
  const [input, setInput] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading, suggestions]);

  function handleSubmit(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");
    onSend(text);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      handleSubmit(e);
    }
  }

  function handleSuggestion(text) {
    if (isLoading) return;
    onSend(text);
  }

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 px-4 py-6">
        <div className="space-y-5 max-w-2xl mx-auto">
          {messages.length === 0 && !isLoading && (
            <div className="text-center py-12 space-y-2">
              <p className="text-sm text-muted-foreground">
                Tell me what kind of synthetic data you'd like to generate.
              </p>
              <p className="text-xs text-muted-foreground/60">
                I'll ask a few questions and build your configuration step by step.
              </p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={cn(
                "flex gap-3",
                msg.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              {msg.role === "assistant" && (
                <div
                  className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                    msg.isError
                      ? "bg-destructive/10 border border-destructive/20"
                      : "bg-primary/10 border border-primary/20"
                  )}
                >
                  {msg.isError ? (
                    <AlertCircle className="w-3.5 h-3.5 text-destructive" />
                  ) : (
                    <span className="text-primary text-xs leading-none">◆</span>
                  )}
                </div>
              )}

              <div
                className={cn(
                  "max-w-[75%] flex flex-col gap-1.5",
                  msg.role === "user" ? "items-end" : "items-start"
                )}
              >
                <div
                  className={cn(
                    "rounded-2xl px-4 py-3 text-sm leading-relaxed",
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : msg.isError
                      ? "bg-destructive/10 border border-destructive/20 text-destructive rounded-bl-sm"
                      : "bg-card border border-border text-foreground rounded-bl-sm"
                  )}
                >
                  {msg.content}
                </div>

                {msg.toolCallsMade?.length > 0 && (
                  <div className="flex flex-wrap gap-1 px-1">
                    {msg.toolCallsMade.map((t) => (
                      <Badge
                        key={t}
                        variant="secondary"
                        className="text-xs font-mono bg-primary/10 text-primary border-primary/20"
                      >
                        {t.replace(/_/g, " ")}
                      </Badge>
                    ))}
                  </div>
                )}

                {msg.timestamp && (
                  <span className="text-xs text-muted-foreground/50 px-1">
                    {formatTime(msg.timestamp)}
                  </span>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-primary text-xs leading-none">◆</span>
              </div>
              <div className="bg-card border border-border rounded-2xl rounded-bl-sm px-4 py-3">
                <div className="flex gap-1.5 items-center h-4">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Suggestion chips — shown after last agent message */}
          {!isLoading && suggestions.length > 0 && (
            <div className="flex flex-wrap gap-2 pl-10 pt-1">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSuggestion(s)}
                  className={cn(
                    "text-xs px-3.5 py-2 rounded-full border transition-all duration-150",
                    "border-primary/30 text-primary bg-primary/5",
                    "hover:bg-primary/15 hover:border-primary/60 hover:shadow-[0_0_10px_hsl(235_80%_65%/0.2)]",
                    "active:scale-95 cursor-pointer font-medium"
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {readyToGenerate && (
        <div className="px-4 pb-2 max-w-2xl mx-auto w-full">
          <ConfirmGenerate config={config} onGenerate={onGenerate} />
        </div>
      )}

      <div className="border-t border-border bg-card/50 backdrop-blur-sm p-4">
        <form onSubmit={handleSubmit} className="flex gap-2 max-w-2xl mx-auto">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message…"
            disabled={isLoading}
            className="flex-1 bg-background border-border focus-visible:ring-primary/30"
          />
          <Button
            type="submit"
            size="icon"
            disabled={isLoading || !input.trim()}
            className="shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
