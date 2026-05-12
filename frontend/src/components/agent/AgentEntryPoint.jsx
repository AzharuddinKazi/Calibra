import { useState } from "react";
import { MessageSquare, UploadCloud, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AgentEntryPoint({ onSelectMode, isLoading = false, error = null }) {
  const [activeCard, setActiveCard] = useState(null);

  function handleClick(entryPoint, mode) {
    if (isLoading) return;
    setActiveCard(entryPoint);
    onSelectMode(entryPoint, mode);
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-screen px-4 py-16 relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,hsl(235_80%_65%/0.12),transparent)]"
      />

      <div className="w-full max-w-3xl space-y-14 relative z-10">
        <div className="text-center space-y-5">
          <div className="flex items-center justify-center mb-1">
            <span className="text-primary text-5xl leading-none drop-shadow-[0_0_24px_hsl(235_80%_65%/0.6)]">
              ◆
            </span>
          </div>
          <div className="space-y-2">
            <h1 className="text-4xl font-semibold tracking-tight text-foreground">
              Calibra
            </h1>
            <p className="text-muted-foreground text-base max-w-md mx-auto leading-relaxed">
              Domain-configurable synthetic data for financial crime detection
            </p>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 max-w-md mx-auto">
            <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <EntryCard
            icon={MessageSquare}
            title="AI Agent"
            badge="Recommended"
            description="Describe what you need in natural language. The agent builds your configuration step by step."
            onClick={() => handleClick("agent_first", "chat")}
            loading={isLoading && activeCard === "agent_first"}
            disabled={isLoading}
          />
          <EntryCard
            icon={UploadCloud}
            title="Upload Dataset"
            description="Upload a sample CSV. Calibra learns its structure and generates data at scale with domain constraints."
            onClick={() => handleClick("upload_first", "upload")}
            loading={false}
            disabled={isLoading}
          />
        </div>

        <p className="text-center text-xs text-muted-foreground/50 tracking-wide uppercase">
          Fraud detection · AML transaction monitoring · Financial crime
        </p>
      </div>
    </div>
  );
}

function EntryCard({ icon: Icon, title, badge, description, onClick, loading, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "group relative text-left p-7 rounded-xl border border-border bg-card",
        "hover:border-primary/40 hover:bg-accent/50 transition-all duration-200",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "shadow-[0_1px_3px_hsl(0_0%_0%/0.3)]",
        !disabled && "hover:shadow-[0_0_0_1px_hsl(var(--primary)/0.2),0_4px_24px_hsl(var(--primary)/0.08)]",
        disabled && "opacity-60 cursor-not-allowed"
      )}
    >
      <div className="space-y-5">
        <div className="flex items-start justify-between">
          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors border border-primary/10">
            {loading ? (
              <Loader2 className="h-5 w-5 text-primary animate-spin" />
            ) : (
              <Icon className="h-5 w-5 text-primary" />
            )}
          </div>
          {badge && (
            <span className="text-xs font-medium text-primary bg-primary/10 border border-primary/20 rounded-full px-2.5 py-0.5">
              {badge}
            </span>
          )}
        </div>
        <div className="space-y-2">
          <h2 className="font-semibold text-lg text-foreground leading-tight">{title}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
        </div>
      </div>
      <div className="mt-6 flex items-center text-xs text-primary font-medium gap-1 group-hover:gap-2 transition-all">
        {loading ? "Connecting…" : "Get started"}{" "}
        {!loading && <span className="transition-transform group-hover:translate-x-0.5">→</span>}
      </div>
    </button>
  );
}
