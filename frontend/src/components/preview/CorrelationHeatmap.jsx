import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function cellColor(value) {
  const v = Math.max(-1, Math.min(1, value));
  if (v > 0) {
    const i = Math.round(v * 200);
    return `rgb(${255 - i},${255 - i},255)`;
  }
  const i = Math.round(-v * 200);
  return `rgb(255,${255 - i},${255 - i})`;
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

export default function CorrelationHeatmap({ correlation }) {
  if (!correlation) return <p className="text-sm text-muted-foreground">Correlation data not available.</p>;
  const { real, synthetic, column_names } = correlation;
  return (
    <div className="space-y-3">
      {column_names.length > 10 && (
        <p className="text-xs text-muted-foreground">Showing top 10 columns by variance.</p>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Heatmap matrix={real} columns={column_names} title="Real Data" />
        <Heatmap matrix={synthetic} columns={column_names} title="Synthetic Data" />
      </div>
    </div>
  );
}
