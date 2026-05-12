import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function cellColor(value) {
  const v = Math.max(-1, Math.min(1, value));
  if (v > 0) {
    const i = Math.round(v * 200);
    return `rgb(${255 - i},${255 - i},255)`;
  }
  const i = Math.round(-v * 200);
  return `rgb(255,${255 - i},${255 - i})`;
}

const DELTA_MAX = 0.3;

function deltaColor(delta) {
  const clamped = Math.max(-DELTA_MAX, Math.min(DELTA_MAX, delta));
  const intensity = Math.abs(clamped) / DELTA_MAX;
  const i = Math.round(intensity * 200);
  if (clamped > 0) {
    return `rgb(${255 - i},${255 - i},255)`;
  }
  if (clamped < 0) {
    return `rgb(255,${255 - i},${255 - i})`;
  }
  return "rgb(255,255,255)";
}

function Heatmap({ matrix, columns, title }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="overflow-auto">
        <table className="text-xs border-collapse">
          <thead>
            <tr>
              <th className="w-16" />
              {columns.map((c) => (
                <th key={c} className="px-1 py-1 text-muted-foreground font-normal text-center min-w-[36px]">
                  {c.slice(0, 6)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.map((row, i) => (
              <tr key={i}>
                <td className="pr-2 text-muted-foreground text-right text-xs whitespace-nowrap">{columns[i]?.slice(0, 8)}</td>
                {row.map((val, j) => (
                  <td
                    key={j}
                    style={{ backgroundColor: cellColor(val) }}
                    className="border border-white min-w-[36px] h-8 text-center"
                    title={`${columns[i]} × ${columns[j]}: ${val.toFixed(3)}`}
                  >
                    <span className="text-gray-700" style={{ fontSize: "9px" }}>{val.toFixed(2)}</span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function DeltaHeatmap({ real, synthetic, columns }) {
  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-semibold text-foreground">Real − Synthetic Correlation Delta</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Blue = real has stronger correlation · Red = synthetic over-correlates
        </p>
      </div>

      <Card>
        <CardContent className="overflow-auto pt-4">
          <table className="text-xs border-collapse">
            <thead>
              <tr>
                <th className="w-16" />
                {columns.map((c) => (
                  <th key={c} className="px-1 py-1 text-muted-foreground font-normal text-center min-w-[36px]">
                    {c.slice(0, 6)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {real.map((row, i) => (
                <tr key={i}>
                  <td className="pr-2 text-muted-foreground text-right text-xs whitespace-nowrap">
                    {columns[i]?.slice(0, 8)}
                  </td>
                  {row.map((realVal, j) => {
                    const synthVal = synthetic[i]?.[j] ?? 0;
                    const delta = realVal - synthVal;
                    return (
                      <td
                        key={j}
                        style={{ backgroundColor: deltaColor(delta) }}
                        className="border border-white min-w-[36px] h-8 text-center"
                        title={`real: ${realVal.toFixed(3)}, synth: ${synthVal.toFixed(3)}, delta: ${delta.toFixed(3)}`}
                      >
                        <span className="text-gray-700" style={{ fontSize: "9px" }}>
                          {delta >= 0 ? "+" : ""}{delta.toFixed(2)}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>Legend:</span>
        <div className="flex items-center gap-0.5">
          <div className="w-4 h-3 rounded" style={{ backgroundColor: deltaColor(-DELTA_MAX) }} />
          <div className="w-4 h-3 rounded" style={{ backgroundColor: deltaColor(-DELTA_MAX * 0.5) }} />
          <div className="w-4 h-3 rounded border border-border" style={{ backgroundColor: deltaColor(0) }} />
          <div className="w-4 h-3 rounded" style={{ backgroundColor: deltaColor(DELTA_MAX * 0.5) }} />
          <div className="w-4 h-3 rounded" style={{ backgroundColor: deltaColor(DELTA_MAX) }} />
        </div>
        <span>−0.3 ←→ +0.3</span>
      </div>
    </div>
  );
}

export default function CorrelationHeatmap({ correlation }) {
  const [viewMode, setViewMode] = useState("side-by-side");

  if (!correlation) return <p className="text-sm text-muted-foreground">Correlation data not available.</p>;
  const { real, synthetic, column_names } = correlation;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5">
        {[
          { value: "side-by-side", label: "Side by Side" },
          { value: "delta", label: "Delta View" },
        ].map((opt) => (
          <button
            key={opt.value}
            onClick={() => setViewMode(opt.value)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium transition-colors border",
              viewMode === opt.value
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:text-foreground"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {column_names.length > 10 && (
        <p className="text-xs text-muted-foreground">Showing top 10 columns by variance.</p>
      )}

      {viewMode === "side-by-side" ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Heatmap matrix={real} columns={column_names} title="Real Data" />
          <Heatmap matrix={synthetic} columns={column_names} title="Synthetic Data" />
        </div>
      ) : (
        <DeltaHeatmap real={real} synthetic={synthetic} columns={column_names} />
      )}
    </div>
  );
}
