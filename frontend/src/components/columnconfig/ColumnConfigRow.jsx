import { memo } from "react";
import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const COL_TYPE_OPTIONS = [
  { value: "continuous", label: "Continuous" },
  { value: "categorical", label: "Categorical" },
  { value: "datetime", label: "Datetime" },
  { value: "boolean", label: "Boolean" },
  { value: "id", label: "ID" },
];

const DISTRIBUTION_OPTIONS = [
  { value: "auto", label: "Auto" },
  { value: "normal", label: "Normal" },
  { value: "lognormal", label: "Log-normal" },
  { value: "uniform", label: "Uniform" },
  { value: "exponential", label: "Exponential" },
  { value: "categorical", label: "Categorical" },
];

function formatParams(params) {
  if (!params || Object.keys(params).length === 0) return "—";
  const entries = Object.entries(params)
    .filter(([, v]) => v !== null && v !== undefined && !Array.isArray(v))
    .slice(0, 3)
    .map(([k, v]) => `${k}=${typeof v === "number" ? v.toFixed(2) : v}`);
  return entries.length > 0 ? entries.join(", ") : "—";
}

function StatusBadge({ status, errorMessage }) {
  if (status === "processing") {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
        <span>Processing…</span>
      </div>
    );
  }
  if (status === "done") {
    return (
      <div className="flex items-center gap-1.5 text-xs text-emerald-400">
        <CheckCircle2 className="h-3.5 w-3.5" />
        <span>Configured</span>
      </div>
    );
  }
  if (status === "error") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5 text-xs text-destructive cursor-help">
              <AlertCircle className="h-3.5 w-3.5" />
              <span>Error</span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <p className="text-xs">{errorMessage || "An error occurred."}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  return <span className="text-xs text-muted-foreground/60">Pending</span>;
}

const ColumnConfigRow = memo(function ColumnConfigRow({ col, onFieldChange, onProcess, isProcessingAll }) {
  const canProcess = col.instruction.trim().length > 0 && col.status !== "processing";
  const displayParams = col.result?.updated_params
    ? col.result.updated_params
    : col.distribution_params;

  return (
    <>
      <TableRow className={cn(col.status === "done" && "bg-emerald-500/5")}>
        <TableCell className="w-48">
          <code className="font-mono text-sm font-medium text-foreground bg-muted/40 px-1.5 py-0.5 rounded text-xs">
            {col.name}
          </code>
        </TableCell>

        <TableCell className="w-36">
          <Select
            value={col.col_type}
            onValueChange={(v) => onFieldChange("col_type", v)}
            disabled={col.status === "processing" || isProcessingAll}
          >
            <SelectTrigger className="h-8 text-xs border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COL_TYPE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </TableCell>

        <TableCell className="w-36">
          <Select
            value={col.distribution_hint ?? "auto"}
            onValueChange={(v) => onFieldChange("distribution_hint", v === "auto" ? null : v)}
            disabled={col.status === "processing" || isProcessingAll}
          >
            <SelectTrigger className="h-8 text-xs border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DISTRIBUTION_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </TableCell>

        <TableCell className="w-40">
          <code className="text-xs text-muted-foreground font-mono break-all">
            {formatParams(displayParams)}
          </code>
        </TableCell>

        <TableCell className="min-w-[200px]">
          <Textarea
            value={col.instruction}
            onChange={(e) => onFieldChange("instruction", e.target.value)}
            placeholder="e.g. lognormal, max $50,000, mostly small transactions"
            className="min-h-[56px] text-xs resize-none border-border focus-visible:ring-primary/30 bg-background"
            disabled={col.status === "processing" || isProcessingAll}
            rows={2}
          />
        </TableCell>

        <TableCell className="w-28">
          <StatusBadge status={col.status} errorMessage={col.errorMessage} />
        </TableCell>

        <TableCell className="w-24">
          <Button
            size="sm"
            variant="outline"
            onClick={onProcess}
            disabled={!canProcess || isProcessingAll}
            className="text-xs h-7 border-border hover:border-primary/40 hover:text-primary"
          >
            Process
          </Button>
        </TableCell>
      </TableRow>

      {col.status === "done" && col.result?.readable_summary && (
        <TableRow className="bg-primary/5 border-l-2 border-primary/30">
          <TableCell colSpan={7} className="py-2 px-4">
            <p className="text-xs text-muted-foreground leading-relaxed">
              <span className="text-primary font-medium">✓ </span>
              {col.result.readable_summary}
            </p>
          </TableCell>
        </TableRow>
      )}
    </>
  );
});

export default ColumnConfigRow;
