function cellColor(value) {
  const v = Math.max(-1, Math.min(1, value));
  if (v > 0) {
    const intensity = Math.round(v * 200);
    return `rgb(${255 - intensity}, ${255 - intensity}, 255)`;
  }
  const intensity = Math.round(-v * 200);
  return `rgb(255, ${255 - intensity}, ${255 - intensity})`;
}

function Heatmap({ matrix, columns, title }) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-600 mb-2">{title}</p>
      <div className="overflow-auto">
        <table className="text-xs border-collapse">
          <thead>
            <tr>
              <th className="w-16" />
              {columns.map((c) => (
                <th key={c} className="px-1 py-1 text-gray-500 font-normal text-center rotate-0 min-w-[40px]">
                  {c.slice(0, 6)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.map((row, i) => (
              <tr key={i}>
                <td className="pr-2 text-gray-500 whitespace-nowrap text-right">{columns[i]?.slice(0, 8)}</td>
                {row.map((val, j) => (
                  <td
                    key={j}
                    style={{ backgroundColor: cellColor(val) }}
                    className="text-center border border-white min-w-[40px] h-8"
                    title={`${columns[i]} × ${columns[j]}: ${val.toFixed(3)}`}
                  >
                    <span className="text-gray-700" style={{ fontSize: "9px" }}>
                      {val.toFixed(2)}
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function CorrelationHeatmap({ correlation }) {
  if (!correlation) return <p className="text-sm text-gray-500">Correlation data not available.</p>;

  const { real, synthetic, column_names } = correlation;
  const note = column_names.length > 10 ? "Showing top 10 columns by variance." : null;

  return (
    <div className="space-y-4">
      {note && <p className="text-xs text-gray-400 italic">{note}</p>}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Heatmap matrix={real} columns={column_names} title="Real Data" />
        <Heatmap matrix={synthetic} columns={column_names} title="Synthetic Data" />
      </div>
    </div>
  );
}
