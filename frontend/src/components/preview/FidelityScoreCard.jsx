import { cn } from "@/lib/utils";

function scoreConfig(v) {
  if (v >= 0.8) {
    return {
      color: "text-emerald-400",
      border: "border-t-emerald-500",
      bg: "bg-emerald-500/10",
      badgeText: "text-emerald-400",
      badgeBg: "bg-emerald-500/10 border-emerald-500/20",
      label: "Excellent",
      description: "Suitable for model training",
    };
  }
  if (v >= 0.75) {
    return {
      color: "text-amber-400",
      border: "border-t-amber-500",
      bg: "bg-amber-500/10",
      badgeText: "text-amber-400",
      badgeBg: "bg-amber-500/10 border-amber-500/20",
      label: "Acceptable",
      description: "Review before use",
    };
  }
  return {
    color: "text-red-400",
    border: "border-t-red-500",
    bg: "bg-red-500/10",
    badgeText: "text-red-400",
    badgeBg: "bg-red-500/10 border-red-500/20",
    label: "Below threshold",
    description: "Exercise caution",
  };
}

function ScoreCard({ label, value, large }) {
  const cfg = scoreConfig(value);
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-5 flex flex-col gap-3",
        "border-t-2",
        cfg.border
      )}
    >
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {label}
      </p>
      <p
        className={cn(
          "font-bold tabular-nums font-mono leading-none",
          large ? "text-4xl" : "text-2xl",
          cfg.color
        )}
      >
        {(value * 100).toFixed(1)}
        <span className={cn("ml-0.5", large ? "text-2xl" : "text-lg")}>%</span>
      </p>
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
            cfg.badgeBg,
            cfg.badgeText
          )}
        >
          {cfg.label}
        </span>
        <span className="text-xs text-muted-foreground">{cfg.description}</span>
      </div>
    </div>
  );
}

export default function FidelityScoreCard({ fidelity }) {
  if (!fidelity) return null;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <ScoreCard label="Composite Score" value={fidelity.composite} large />
      <ScoreCard label="Column Fidelity" value={fidelity.column_fidelity} />
      <ScoreCard label="Correlation Fidelity" value={fidelity.correlation_fidelity} />
    </div>
  );
}
