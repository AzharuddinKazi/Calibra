import { useState } from "react";
import { Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const DIST_OPTIONS = {
  continuous: ["normal", "lognormal", "uniform", "exponential"],
  categorical: ["categorical"],
  boolean: [],
  datetime: [],
  id: [],
};

const TYPE_BADGE = {
  continuous: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  categorical: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  boolean: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  datetime: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  id: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
};

function ParamInputs({ colType, distribution, params, inferredParams, onChange }) {
  if (colType === "boolean") {
    return (
      <div className="flex items-center gap-3">
        <Label className="text-xs text-muted-foreground w-20 shrink-0">P (true)</Label>
        <Input
          type="number"
          step="0.01"
          min="0"
          max="1"
          className="h-7 text-xs w-28"
          placeholder={String(inferredParams?.p ?? 0.5)}
          value={params.p ?? ""}
          onChange={(e) => onChange({ ...params, p: e.target.value === "" ? undefined : parseFloat(e.target.value) })}
        />
      </div>
    );
  }

  if (distribution === "normal") {
    return (
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground w-14 shrink-0">Mean</Label>
          <Input
            type="number"
            step="any"
            className="h-7 text-xs w-28"
            placeholder={String(inferredParams?.loc ?? 0)}
            value={params.loc ?? ""}
            onChange={(e) => onChange({ ...params, loc: e.target.value === "" ? undefined : parseFloat(e.target.value) })}
          />
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground w-14 shrink-0">Std Dev</Label>
          <Input
            type="number"
            step="any"
            min="0"
            className="h-7 text-xs w-28"
            placeholder={String(inferredParams?.scale ?? 1)}
            value={params.scale ?? ""}
            onChange={(e) => onChange({ ...params, scale: e.target.value === "" ? undefined : parseFloat(e.target.value) })}
          />
        </div>
      </div>
    );
  }

  if (distribution === "lognormal") {
    return (
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground w-16 shrink-0">Shape (s)</Label>
          <Input
            type="number"
            step="any"
            min="0"
            className="h-7 text-xs w-24"
            placeholder={String(inferredParams?.s ?? 1)}
            value={params.s ?? ""}
            onChange={(e) => onChange({ ...params, s: e.target.value === "" ? undefined : parseFloat(e.target.value) })}
          />
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground w-16 shrink-0">Location</Label>
          <Input
            type="number"
            step="any"
            className="h-7 text-xs w-24"
            placeholder={String(inferredParams?.loc ?? 0)}
            value={params.loc ?? ""}
            onChange={(e) => onChange({ ...params, loc: e.target.value === "" ? undefined : parseFloat(e.target.value) })}
          />
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground w-16 shrink-0">Scale</Label>
          <Input
            type="number"
            step="any"
            min="0"
            className="h-7 text-xs w-24"
            placeholder={String(inferredParams?.scale ?? 1)}
            value={params.scale ?? ""}
            onChange={(e) => onChange({ ...params, scale: e.target.value === "" ? undefined : parseFloat(e.target.value) })}
          />
        </div>
      </div>
    );
  }

  if (distribution === "uniform") {
    const inferredMin = inferredParams?.loc ?? 0;
    const inferredMax = (inferredParams?.loc ?? 0) + (inferredParams?.scale ?? 1);
    return (
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground w-10 shrink-0">Min</Label>
          <Input
            type="number"
            step="any"
            className="h-7 text-xs w-28"
            placeholder={String(inferredMin)}
            value={params._uniform_min ?? ""}
            onChange={(e) => onChange({ ...params, _uniform_min: e.target.value === "" ? undefined : parseFloat(e.target.value) })}
          />
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground w-10 shrink-0">Max</Label>
          <Input
            type="number"
            step="any"
            className="h-7 text-xs w-28"
            placeholder={String(inferredMax)}
            value={params._uniform_max ?? ""}
            onChange={(e) => onChange({ ...params, _uniform_max: e.target.value === "" ? undefined : parseFloat(e.target.value) })}
          />
        </div>
      </div>
    );
  }

  if (distribution === "exponential") {
    return (
      <div className="flex items-center gap-2">
        <Label className="text-xs text-muted-foreground w-14 shrink-0">Scale</Label>
        <Input
          type="number"
          step="any"
          min="0"
          className="h-7 text-xs w-28"
          placeholder={String(inferredParams?.scale ?? 1)}
          value={params.scale ?? ""}
          onChange={(e) => onChange({ ...params, scale: e.target.value === "" ? undefined : parseFloat(e.target.value) })}
        />
      </div>
    );
  }

  return null;
}

function buildFinalParams(distribution, params) {
  if (distribution === "uniform") {
    const min = params._uniform_min ?? 0;
    const max = params._uniform_max ?? 1;
    return { loc: min, scale: Math.max(max - min, 1e-9) };
  }
  const clean = { ...params };
  delete clean._uniform_min;
  delete clean._uniform_max;
  return clean;
}

function RowEditor({ profile, override, onApply, onClear, onEditCategory }) {
  const opts = DIST_OPTIONS[profile.col_type] ?? [];
  const isAutoManaged = profile.col_type === "datetime" || profile.col_type === "id";
  const isCategorical = profile.col_type === "categorical";

  const [selectedDist, setSelectedDist] = useState(
    override?.distribution ?? profile.distribution ?? opts[0] ?? null
  );
  const [params, setParams] = useState(override?.params ?? {});

  if (isAutoManaged) {
    return (
      <div className="px-4 py-3 bg-muted/30 rounded-md border border-border/40">
        <Badge variant="outline" className="text-xs text-muted-foreground">Auto-managed</Badge>
      </div>
    );
  }

  if (isCategorical) {
    return (
      <div className="px-4 py-3 bg-muted/30 rounded-md border border-border/40 text-xs text-muted-foreground">
        Edit frequencies in the{" "}
        <button
          className="text-primary underline underline-offset-2 hover:no-underline"
          onClick={() => onEditCategory(profile.name)}
        >
          Category Frequency Editor
        </button>{" "}
        below.
      </div>
    );
  }

  function handleApply() {
    const finalParams = buildFinalParams(selectedDist, params);
    onApply(profile.name, { distribution: selectedDist, params: finalParams });
  }

  return (
    <div className="px-4 py-4 bg-muted/30 rounded-md border border-border/40 space-y-4">
      {opts.length > 0 && (
        <div className="flex items-center gap-3">
          <Label className="text-xs text-muted-foreground w-20 shrink-0">Distribution</Label>
          <Select
            value={selectedDist ?? ""}
            onValueChange={(v) => { setSelectedDist(v); setParams({}); }}
          >
            <SelectTrigger className="h-7 text-xs w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {opts.map((o) => (
                <SelectItem key={o} value={o} className="text-xs">{o}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <ParamInputs
        colType={profile.col_type}
        distribution={selectedDist}
        params={params}
        inferredParams={profile.distribution_params}
        onChange={setParams}
      />

      <div className="flex gap-2 pt-1">
        <Button size="sm" className="h-7 text-xs" onClick={handleApply}>Apply</Button>
        {override && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => onClear(profile.name)}
          >
            Clear Override
          </Button>
        )}
      </div>
    </div>
  );
}

export default function DistributionEditor({
  columns,
  overrides,
  onOverrideChange,
  onOverrideClear,
  onEditCategoryColumn,
}) {
  const [expandedCol, setExpandedCol] = useState(null);

  if (!columns || columns.length === 0) return null;

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-semibold text-foreground">Distribution Overrides</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Override auto-inferred distributions per column
        </p>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground w-1/4">Column Name</th>
              <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground w-1/6">Type</th>
              <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground w-1/4">Inferred Distribution</th>
              <th className="text-right px-4 py-2.5 font-semibold text-muted-foreground w-1/3">Override</th>
            </tr>
          </thead>
          <tbody>
            {columns.map((col) => {
              const hasOverride = !!overrides[col.name];
              const isExpanded = expandedCol === col.name;

              return (
                <>
                  <tr
                    key={col.name}
                    className={cn(
                      "border-b border-border/60 transition-colors",
                      isExpanded && "bg-muted/20"
                    )}
                  >
                    <td className="px-4 py-2.5 font-medium text-foreground">{col.name}</td>
                    <td className="px-4 py-2.5">
                      <Badge
                        variant="outline"
                        className={cn("text-xs capitalize", TYPE_BADGE[col.col_type] ?? "")}
                      >
                        {col.col_type}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {col.distribution ?? <span className="italic text-muted-foreground/50">auto</span>}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {hasOverride && (
                          <Badge className="text-xs bg-primary/15 text-primary border-primary/30">
                            Overridden
                          </Badge>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          onClick={() => setExpandedCol(isExpanded ? null : col.name)}
                        >
                          {isExpanded ? <X className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
                        </Button>
                      </div>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr key={`${col.name}-editor`} className="border-b border-border/60 bg-muted/10">
                      <td colSpan={4} className="px-4 py-3">
                        <RowEditor
                          profile={col}
                          override={overrides[col.name] ?? null}
                          onApply={(name, ov) => {
                            onOverrideChange(name, ov);
                            setExpandedCol(null);
                          }}
                          onClear={(name) => {
                            onOverrideClear(name);
                            setExpandedCol(null);
                          }}
                          onEditCategory={(name) => {
                            onEditCategoryColumn?.(name);
                            setExpandedCol(null);
                          }}
                        />
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
