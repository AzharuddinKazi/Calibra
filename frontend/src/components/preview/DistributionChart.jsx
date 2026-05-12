import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

function buildData(real, synthetic) {
  const bins = real?.histogram?.bins || [];
  return bins.slice(0, -1).map((bin, i) => {
    const kdei = Math.floor((i / Math.max(bins.length - 1, 1)) * ((real?.kde?.y?.length || 1) - 1));
    return {
      bin: typeof bin === "number" ? bin.toFixed(1) : String(bin),
      real: real?.histogram?.counts?.[i] ?? 0,
      synthetic: synthetic?.histogram?.counts?.[i] ?? 0,
      realKde: real?.kde?.y?.[kdei] ?? 0,
      syntheticKde: synthetic?.kde?.y?.[kdei] ?? 0,
    };
  });
}

export default function DistributionChart({ column }) {
  if (!column) return null;

  const isCat = column.type === "categorical" || column.type === "boolean";
  const data = buildData(column.real, column.synthetic);
  const statsFields = ["mean", "stddev", "min", "max"];

  return (
    <div className="space-y-4">
      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={data} barGap={0}>
          <XAxis dataKey="bin" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip />
          <Legend />
          <Bar dataKey="real" fill="#3B82F6" fillOpacity={0.6} name="Real" />
          <Bar dataKey="synthetic" fill="#F97316" fillOpacity={0.6} name="Synthetic" />
          {!isCat && (
            <>
              <Line type="monotone" dataKey="realKde" stroke="#1D4ED8" dot={false} strokeWidth={1.5} name="Real KDE" />
              <Line type="monotone" dataKey="syntheticKde" stroke="#EA580C" dot={false} strokeDasharray="4 2" strokeWidth={1.5} name="Synthetic KDE" />
            </>
          )}
        </ComposedChart>
      </ResponsiveContainer>

      {!isCat && column.real?.stats && (
        <div className="grid grid-cols-4 gap-2">
          {statsFields.map((f) => (
            <Card key={f}>
              <CardContent className="py-2 px-3">
                <p className="text-xs text-muted-foreground capitalize mb-1">{f}</p>
                <p className="text-sm font-medium">{column.real.stats[f]?.toFixed(3) ?? "—"}</p>
                <p className="text-xs text-orange-600">{column.synthetic.stats?.[f]?.toFixed(3) ?? "—"}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
