import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2 } from "lucide-react";

function FieldRow({ label, value, required }) {
  const missing = required && (value === null || value === undefined || value === "");
  return (
    <div className="flex justify-between items-center py-1.5">
      <span className="text-sm text-muted-foreground flex items-center gap-1.5">
        {required && missing && <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />}
        {label}
      </span>
      <span className={`text-sm font-medium ${missing ? "text-muted-foreground italic" : ""}`}>
        {missing ? "not set" : String(value)}
      </span>
    </div>
  );
}

export default function ConfigSummaryPanel({ config }) {
  if (!config) return null;

  const { domain_pack, typologies, row_count, prevalence, constraints, ready_to_generate } = config;
  const prevalenceSummary = prevalence
    ? Object.entries(prevalence).map(([k, v]) => `${k}: ${(v * 100).toFixed(1)}%`).join(", ")
    : null;

  return (
    <Card className="sticky top-20">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Current Configuration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        <FieldRow label="Domain Pack" value={domain_pack} required />
        <FieldRow label="Typologies" value={typologies?.join(", ") || null} />
        <Separator className="my-2" />
        <FieldRow label="Prevalence" value={prevalenceSummary} required />
        <FieldRow label="Row Count" value={row_count ? row_count.toLocaleString() : null} required />
        <Separator className="my-2" />
        <FieldRow label="Constraints" value={constraints?.length ? `${constraints.length} active` : null} />

        {ready_to_generate && (
          <div className="mt-3 flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>Ready to generate</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
