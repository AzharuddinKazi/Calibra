export default function ColumnPreviewTable({ profiles }) {
  if (!profiles || profiles.length === 0) return null;

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            {["Column", "Type", "Null Rate", "Unique", "Mean / Top Values"].map((h) => (
              <th key={h} className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {profiles.map((p, i) => (
            <tr key={p.name} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
              <td className="px-4 py-2 font-mono font-medium text-gray-800">{p.name}</td>
              <td className="px-4 py-2">
                <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700">
                  {p.col_type}
                </span>
              </td>
              <td className="px-4 py-2 text-gray-600">
                {(p.stats.null_rate * 100).toFixed(1)}%
              </td>
              <td className="px-4 py-2 text-gray-600">{p.stats.unique_count}</td>
              <td className="px-4 py-2 text-gray-600">
                {p.stats.mean != null
                  ? `mean=${p.stats.mean.toFixed(3)}`
                  : (p.stats.top_values || []).slice(0, 3).join(", ") || "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
