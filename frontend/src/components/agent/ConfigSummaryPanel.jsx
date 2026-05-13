import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { CheckCircle2, TableProperties } from "lucide-react";
import { cn } from "@/lib/utils";

function FieldRow({ label, value, required }) {
  const missing = required && (value === null || value === undefined || value === "");
  return (
    <div className="flex justify-between items-center py-1.5 gap-3">
      <span className="text-xs text-muted-foreground flex items-center gap-1.5 shrink-0">
        {required && missing && (
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block shrink-0" />
        )}
        {label}
      </span>
      <span
        className={cn(
          "text-xs font-medium text-right truncate max-w-[140px]",
          missing ? "text-muted-foreground/40 italic" : "text-foreground"
        )}
      >
        {missing ? "not set" : String(value)}
      </span>
    </div>
  );
}

export default function ConfigSummaryPanel({ config, hasColumns = false, onConfigureColumns }) {
  if (!config) return null;

  const { domain_pack, typologies, row_count, prevalence, constraints, columns, ready_to_generate } = config;
  const prevalenceSummary = prevalence
    ? Object.entries(prevalence)
        .map(([k, v]) => `${k}: ${(v * 100).toFixed(1)}%`)
        .join(", ")
    : null;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Live Configuration
        </p>
        {ready_to_generate && (
          <span className="flex items-center gap-1 text-xs text-emerald-400 font-medium">
            <CheckCircle2 className="h-3 w-3" />
            Ready
          </span>
        )}
      </div>

      <FieldRow label="Domain Pack" value={domain_pack} required />
      <FieldRow label="Typologies" value={typologies?.join(", ") || null} />
      <Separator className="my-2" />
      <FieldRow label="Prevalence" value={prevalenceSummary} required />
      <FieldRow
        label="Row Count"
        value={row_count ? row_count.toLocaleString() : null}
        required
      />
      <Separator className="my-2" />
      <FieldRow
        label="Constraints"
        value={constraints?.length ? `${constraints.length} active` : null}
      />
      <FieldRow
        label="Columns"
        value={columns?.length ? `${columns.length} defined` : null}
      />

      {hasColumns && onConfigureColumns && (
        <>
          <Separator className="my-3" />
          <Button
            onClick={onConfigureColumns}
            variant="outline"
            size="sm"
            className="w-full gap-2 border-primary/30 text-primary hover:border-primary/60 hover:bg-primary/5 text-xs h-8"
          >
            <TableProperties className="h-3 w-3" />
            Configure Columns
          </Button>
        </>
      )}

      {ready_to_generate && (
        <div className="mt-4 flex items-center gap-2 text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2.5">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
          <span>Configuration complete</span>
        </div>
      )}
    </div>
  );
}
