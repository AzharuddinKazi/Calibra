import { useState, useRef, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Send, AlertCircle, TableProperties, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import ConfirmGenerate from "./ConfirmGenerate";
import QuestionModal from "./QuestionModal";

function formatTime(date) {
  return new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function AgentChat({
  messages,
  isLoading,
  readyToGenerate,
  config,
  suggestions = [],
  suggestionKey,
  hasColumns = false,
  generationError = null,
  onSend,
  onGenerate,
  onConfigureColumns,
}) {
  const [input, setInput] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Open the question modal whenever new suggestions arrive and we're not loading
  useEffect(() => {
    if (suggestions.length > 0 && !isLoading) {
      setModalOpen(true);
    }
  }, [suggestions, isLoading]);

  // Derive the last agent question for the modal header
  const lastAgentMessage = [...messages]
    .reverse()
    .find((m) => m.role === "assistant" && !m.isError);
  const modalQuestion =
    lastAgentMessage?.content ?? "How would you like to proceed?";

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

  function handleModalSelect(text) {
    setModalOpen(false);
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

          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Generation error banner */}
      {generationError && (
        <div className="px-4 pb-2 max-w-2xl mx-auto w-full">
          <div className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3">
            <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-destructive">Generation failed</p>
              <p className="text-xs text-destructive/80 mt-0.5 break-words">{generationError}</p>
            </div>
          </div>
        </div>
      )}

      {/* "Configure Columns" button — always visible once columns exist, even after mark_ready */}
      {hasColumns && (
        <div className="px-4 pb-2 max-w-2xl mx-auto w-full">
          <Button
            onClick={onConfigureColumns}
            variant="outline"
            className="w-full gap-2 border-primary/30 text-primary hover:border-primary/60 hover:bg-primary/5"
            size="sm"
          >
            <TableProperties className="h-4 w-4" />
            Configure your columns →
          </Button>
        </div>
      )}

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

      {/* Question modal — key forces remount each turn so state resets even when options are identical */}
      <QuestionModal
        key={suggestionKey}
        open={modalOpen}
        question={modalQuestion}
        options={suggestions}
        onSelect={handleModalSelect}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}
