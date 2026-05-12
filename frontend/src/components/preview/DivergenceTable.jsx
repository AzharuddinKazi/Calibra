import { useState } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const TYPE_BADGE = {
  continuous: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  categorical: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  boolean: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  datetime: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  id: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
};

function divergenceColor(jsd) {
  if (jsd < 0.05) return "bg-emerald-500";
  if (jsd <= 0.15) return "bg-amber-500";
  return "bg-red-500";
}

function DivergenceBar({ value }) {
  const pct = Math.min(value * 100, 100);
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden shrink-0">
        <div
          className={cn("h-full rounded-full", divergenceColor(value))}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="font-mono text-xs tabular-nums">{value.toFixed(4)}</span>
    </div>
  );
}

function deltaColor(real, synth) {
  if (real == null || synth == null || real === 0) return "text-muted-foreground";
  const relDiff = Math.abs(real - synth) / Math.abs(real);
  if (relDiff < 0.05) return "text-emerald-400";
  if (relDiff > 0.10) return "text-red-400";
  return "text-foreground";
}

function formatMean(col, source) {
  const isContinuous = col.type === "continuous";
  if (!isContinuous) return "—";
  const val = col[source]?.stats?.mean;
  if (val == null) return "—";
  return val.toFixed(4);
}

function SortIcon({ column, sortKey, sortDir }) {
  if (sortKey !== column) return <ChevronDown className="w-3 h-3 opacity-20 inline ml-0.5" />;
  return sortDir === "desc"
    ? <ChevronDown className="w-3 h-3 inline ml-0.5" />
    : <ChevronUp className="w-3 h-3 inline ml-0.5" />;
}

export default function DivergenceTable({ columns }) {
  const [sortKey, setSortKey] = useState("js_divergence");
  const [sortDir, setSortDir] = useState("desc");

  if (!columns || columns.length === 0) {
    return <p className="text-sm text-muted-foreground">No column data available.</p>;
  }

  function handleSort(key) {
    if (sortKey === key) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const sorted = [...columns].sort((a, b) => {
    let av, bv;
    if (sortKey === "name") {
      av = a.name;
      bv = b.name;
    } else if (sortKey === "type") {
      av = a.type;
      bv = b.type;
    } else if (sortKey === "js_divergence") {
      av = a.js_divergence;
      bv = b.js_divergence;
    } else if (sortKey === "real_mean") {
      av = a.real?.stats?.mean ?? -Infinity;
      bv = b.real?.stats?.mean ?? -Infinity;
    } else if (sortKey === "synth_mean") {
      av = a.synthetic?.stats?.mean ?? -Infinity;
      bv = b.synthetic?.stats?.mean ?? -Infinity;
    } else {
      av = a.js_divergence;
      bv = b.js_divergence;
    }
    if (av < bv) return sortDir === "desc" ? 1 : -1;
    if (av > bv) return sortDir === "desc" ? -1 : 1;
    return 0;
  });

  const aboveThreshold = columns.filter((c) => c.js_divergence > 0.15).length;

  const headers = [
    { key: "name", label: "Column Name" },
    { key: "type", label: "Type" },
    { key: "js_divergence", label: "JS Divergence" },
    { key: "real_mean", label: "Real Mean" },
    { key: "synth_mean", label: "Synth Mean" },
    { key: "delta_mean", label: "Δ Mean" },
  ];

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-semibold text-foreground">Column Fidelity Details</p>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              {headers.map((h) => (
                <th
                  key={h.key}
                  className={cn(
                    "px-4 py-2.5 font-semibold text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors",
                    h.key === "name" ? "text-left" : "text-right"
                  )}
                  onClick={() => h.key !== "delta_mean" && handleSort(h.key)}
                >
                  {h.label}
                  {h.key !== "delta_mean" && <SortIcon column={h.key} sortKey={sortKey} sortDir={sortDir} />}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((col) => {
              const realMean = col.real?.stats?.mean;
              const synthMean = col.synthetic?.stats?.mean;
              const showMean = col.type === "continuous";
              const deltaVal =
                showMean && realMean != null && synthMean != null
                  ? synthMean - realMean
                  : null;
              const deltaStr =
                deltaVal != null
                  ? `${deltaVal >= 0 ? "+" : ""}${deltaVal.toFixed(4)}`
                  : "—";

              return (
                <tr key={col.name} className="border-b border-border/60 hover:bg-muted/10 transition-colors">
                  <td className="px-4 py-2.5 font-semibold text-foreground">{col.name}</td>
                  <td className="px-4 py-2.5 text-right">
                    <Badge
                      variant="outline"
                      className={cn("text-xs capitalize", TYPE_BADGE[col.type] ?? "")}
                    >
                      {col.type}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <DivergenceBar value={col.js_divergence} />
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-muted-foreground">
                    {showMean && realMean != null ? realMean.toFixed(4) : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-muted-foreground">
                    {showMean && synthMean != null ? synthMean.toFixed(4) : "—"}
                  </td>
                  <td className={cn("px-4 py-2.5 text-right font-mono", deltaColor(realMean, synthMean))}>
                    {deltaStr}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
        {aboveThreshold > 0
          ? <span><span className="text-red-400 font-medium">{aboveThreshold}</span> column{aboveThreshold > 1 ? "s" : ""} above 0.15 threshold shown in red</span>
          : "All columns within 0.15 divergence threshold"}
      </p>
    </div>
  );
}
