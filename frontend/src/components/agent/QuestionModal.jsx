import { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export default function QuestionModal({
  open,
  question,
  options = [],
  onSelect,
  onClose,
}) {
  const [freeText, setFreeText] = useState("");
  const textareaRef = useRef(null);

  // Clear free text and focus textarea when modal opens
  useEffect(() => {
    if (open) {
      setFreeText("");
      // Small delay to let the animation finish before focusing
      const timer = setTimeout(() => {
        textareaRef.current?.focus();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [open]);

  function handleOptionClick(option) {
    onSelect(option);
  }

  function handleSubmitFreeText() {
    const text = freeText.trim();
    if (!text) return;
    onSelect(text);
    setFreeText("");
  }

  function handleTextareaKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmitFreeText();
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl border-border bg-background">
        <DialogHeader className="space-y-3 pb-2">
          <div className="flex items-center gap-2">
            <span className="text-primary text-base leading-none drop-shadow-[0_0_12px_hsl(235_80%_65%/0.5)]">
              ◆
            </span>
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
              Calibra is asking
            </span>
          </div>
          <DialogTitle className="text-base font-semibold text-foreground leading-snug text-left max-h-24 overflow-y-auto">
            {question}
          </DialogTitle>
        </DialogHeader>

        {options.length > 0 && (
          <div className="grid grid-cols-2 gap-2.5">
            {options.map((option) => (
              <button
                key={option}
                onClick={() => handleOptionClick(option)}
                className={cn(
                  "group text-left px-4 py-3.5 rounded-lg border border-border bg-card",
                  "hover:border-primary/50 hover:bg-primary/5 transition-all duration-150",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  "text-sm text-foreground"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="leading-snug">{option}</span>
                  <span className="text-muted-foreground/40 group-hover:text-primary/60 transition-colors shrink-0 text-xs">
                    →
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-3 my-1">
          <div className="flex-1 h-px bg-border/50" />
          <span className="text-xs text-muted-foreground/50">or type your own</span>
          <div className="flex-1 h-px bg-border/50" />
        </div>

        <div className="space-y-2.5">
          <Textarea
            ref={textareaRef}
            value={freeText}
            onChange={(e) => setFreeText(e.target.value)}
            onKeyDown={handleTextareaKeyDown}
            placeholder="Type your answer… (Enter to submit, Shift+Enter for new line)"
            className="min-h-[72px] resize-none bg-background border-border focus-visible:ring-primary/30 text-sm"
            rows={3}
          />
          <Button
            onClick={handleSubmitFreeText}
            disabled={!freeText.trim()}
            className="w-full"
            size="sm"
          >
            Submit
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
