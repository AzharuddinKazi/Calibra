import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

function buildHistogramData(real, synthetic) {
  const bins = real?.histogram?.bins || [];
  return bins.slice(0, -1).map((bin, i) => ({
    bin: bin.toFixed(1),
    real: real?.histogram?.counts?.[i] ?? 0,
    synthetic: synthetic?.histogram?.counts?.[i] ?? 0,
    realKde: real?.kde?.y?.[Math.floor((i / bins.length) * (real.kde.y.length - 1))] ?? 0,
    syntheticKde: synthetic?.kde?.y?.[Math.floor((i / bins.length) * (synthetic.kde.y.length - 1))] ?? 0,
  }));
}

function buildCategoricalData(real, synthetic) {
  const categories = real?.histogram?.bins || [];
  return categories.map((cat, i) => ({
    bin: String(cat),
    real: real?.histogram?.counts?.[i] ?? 0,
    synthetic: synthetic?.histogram?.counts?.[i] ?? 0,
  }));
}

export default function DistributionChart({ column }) {
  if (!column) return null;

  const isCategorical = column.type === "categorical" || column.type === "boolean";
  const data = isCategorical
    ? buildCategoricalData(column.real, column.synthetic)
    : buildHistogramData(column.real, column.synthetic);

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
          {!isCategorical && (
            <>
              <Line type="monotone" dataKey="realKde" stroke="#1D4ED8" dot={false} strokeWidth={1.5} name="Real KDE" />
              <Line type="monotone" dataKey="syntheticKde" stroke="#EA580C" dot={false} strokeDasharray="4 2" strokeWidth={1.5} name="Synthetic KDE" />
            </>
          )}
        </ComposedChart>
      </ResponsiveContainer>

      {!isCategorical && column.real?.stats && (
        <div className="grid grid-cols-4 gap-3 text-xs">
          {statsFields.map((f) => (
            <div key={f} className="border border-gray-100 rounded-lg p-3">
              <div className="text-gray-400 mb-1 capitalize">{f}</div>
              <div className="font-medium text-gray-700">
                {column.real.stats[f]?.toFixed(3) ?? "—"}
              </div>
              <div className="text-orange-600">
                {column.synthetic.stats?.[f]?.toFixed(3) ?? "—"}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
