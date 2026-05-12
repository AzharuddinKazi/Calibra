import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelList,
} from "recharts";

export default function PrevalenceBar({ prevalence }) {
  if (!prevalence) return <p className="text-sm text-gray-500">Prevalence data not available.</p>;

  const { target, actual } = prevalence;
  const classes = Object.keys(target || {});

  const data = classes.map((cls) => {
    const t = target[cls] || 0;
    const a = actual[cls] || 0;
    const diffPp = (a - t) * 100;
    const withinTolerance = Math.abs(diffPp) <= 0.5;
    return {
      name: cls.replace("_", " "),
      target: parseFloat((t * 100).toFixed(3)),
      actual: parseFloat((a * 100).toFixed(3)),
      diffPp: diffPp.toFixed(3),
      withinTolerance,
    };
  });

  return (
    <div className="space-y-4">
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} layout="vertical" margin={{ left: 40, right: 60 }}>
          <XAxis type="number" unit="%" tick={{ fontSize: 10 }} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={80} />
          <Tooltip formatter={(v) => `${v}%`} />
          <Legend />
          <Bar dataKey="target" fill="#CBD5E0" name="Target" barSize={14}>
            <LabelList dataKey="target" position="right" formatter={(v) => `${v}%`} style={{ fontSize: 10 }} />
          </Bar>
          <Bar dataKey="actual" name="Actual" barSize={14}
            fill="#3B82F6"
          >
            <LabelList dataKey="diffPp" position="right"
              formatter={(v) => `${parseFloat(v) >= 0 ? "+" : ""}${v}pp`}
              style={{ fontSize: 10 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="text-xs text-gray-400">
        Tolerance: ±0.5 percentage points. Values within tolerance are expected.
      </p>
    </div>
  );
}
