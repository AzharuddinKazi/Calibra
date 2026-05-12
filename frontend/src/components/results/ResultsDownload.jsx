import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, CheckCircle2, Download, FileText, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

function fidelityConfig(score) {
  if (score === null) return { color: "text-muted-foreground", label: "N/A", description: "" };
  if (score >= 0.8)
    return {
      color: "text-emerald-400",
      border: "border-t-emerald-500",
      label: "Excellent",
      description: "Suitable for model training",
    };
  if (score >= 0.75)
    return {
      color: "text-amber-400",
      border: "border-t-amber-500",
      label: "Acceptable",
      description: "Review before use",
    };
  return {
    color: "text-red-400",
    border: "border-t-red-500",
    label: "Below threshold",
    description: "Exercise caution",
  };
}

export default function ResultsDownload({ result, onReplay }) {
  if (!result) return null;

  const { run_id, fidelity_score, constraint_failures, download_url, report_url } = result;
  const belowThreshold = fidelity_score !== null && fidelity_score < 0.75;
  const cfg = fidelityConfig(fidelity_score);

  return (
    <div className="max-w-xl mx-auto space-y-6 py-8">
      <div className="text-center space-y-3">
        <div className="flex items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <CheckCircle2 className="h-8 w-8 text-emerald-400" />
          </div>
        </div>
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight">Dataset Ready</h2>
          <p className="text-xs font-mono text-muted-foreground tracking-wide">
            Run ID: {run_id}
          </p>
        </div>
      </div>

      {fidelity_score !== null && (
        <div
          className={cn(
            "rounded-xl border border-border bg-card p-5 flex items-center justify-between",
            "border-t-2",
            cfg.border
          )}
        >
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">Composite Fidelity Score</p>
            <p className="text-xs text-muted-foreground">{cfg.description}</p>
          </div>
          <div className="text-right space-y-1">
            <p className={cn("text-3xl font-bold tabular-nums font-mono", cfg.color)}>
              {(fidelity_score * 100).toFixed(1)}%
            </p>
            <p className={cn("text-xs font-medium", cfg.color)}>{cfg.label}</p>
          </div>
        </div>
      )}

      {belowThreshold && (
        <Alert variant="destructive" className="border-destructive/30 bg-destructive/10">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-destructive">
            Fidelity score is below the 75% threshold. Review the audit report before using this
            dataset in a model training pipeline.
          </AlertDescription>
        </Alert>
      )}

      {constraint_failures > 0 && (
        <Alert className="border-amber-500/30 bg-amber-500/10">
          <AlertDescription className="text-amber-300">
            {constraint_failures.toLocaleString()} row
            {constraint_failures !== 1 ? "s" : ""} excluded due to constraint validation failures.
            This is expected behaviour — see the audit report for details.
          </AlertDescription>
        </Alert>
      )}

      <Separator />

      <div className="flex flex-col sm:flex-row gap-3">
        {download_url && (
          <Button asChild className="flex-1 h-11" size="lg">
            <a href={download_url} download>
              <Download className="mr-2 h-4 w-4" />
              Download Dataset
            </a>
          </Button>
        )}
        {report_url && (
          <Button asChild variant="outline" className="flex-1 h-11" size="lg">
            <a href={report_url} target="_blank" rel="noreferrer">
              <FileText className="mr-2 h-4 w-4" />
              Audit Report
            </a>
          </Button>
        )}
      </div>

      <button
        onClick={() => onReplay?.(run_id)}
        className="w-full flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        Replay this run
      </button>
    </div>
  );
}
