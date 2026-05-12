import { Card, CardContent } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, LabelList } from "recharts";

export default function PrevalenceBar({ prevalence }) {
  if (!prevalence) return <p className="text-sm text-muted-foreground">Prevalence data not available.</p>;

  const { target, actual } = prevalence;
  const data = Object.keys(target || {}).map((cls) => {
    const t = target[cls] || 0;
    const a = actual[cls] || 0;
    return {
      name: cls.replace("_", " "),
      target: parseFloat((t * 100).toFixed(3)),
      actual: parseFloat((a * 100).toFixed(3)),
      diff: ((a - t) * 100).toFixed(3),
    };
  });

  return (
    <div className="space-y-4">
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} layout="vertical" margin={{ left: 40, right: 80 }}>
          <XAxis type="number" unit="%" tick={{ fontSize: 10 }} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={80} />
          <Tooltip formatter={(v) => `${v}%`} />
          <Legend />
          <Bar dataKey="target" fill="hsl(var(--muted-foreground))" name="Target" barSize={14} fillOpacity={0.5}>
            <LabelList dataKey="target" position="right" formatter={(v) => `${v}%`} style={{ fontSize: 10 }} />
          </Bar>
          <Bar dataKey="actual" fill="hsl(var(--primary))" name="Actual" barSize={14}>
            <LabelList dataKey="diff" position="right" formatter={(v) => `${parseFloat(v) >= 0 ? "+" : ""}${v}pp`} style={{ fontSize: 10 }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="text-xs text-muted-foreground">Tolerance: ±0.5 percentage points.</p>
    </div>
  );
}
