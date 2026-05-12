export default function SampleTable({ rows }) {
  if (!rows || rows.length === 0) {
    return <p className="text-sm text-gray-500">No sample data available.</p>;
  }

  const columns = Object.keys(rows[0]);
  const labelCols = columns.filter((c) => /fraud|sar|label|is_fraud/i.test(c));

  function renderCell(col, val) {
    if (labelCols.includes(col)) {
      const isPositive = val === 1 || val === true || val === "1";
      return (
        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
          isPositive ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
        }`}>
          {String(val)}
        </span>
      );
    }
    return <span className="text-gray-700">{String(val)}</span>;
  }

  const isNumeric = (col) => rows.some((r) => typeof r[col] === "number");

  return (
    <div className="overflow-auto max-h-[400px] rounded-lg border border-gray-200">
      <table className="min-w-full text-xs">
        <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
          <tr>
            {columns.map((c) => (
              <th
                key={c}
                className={`px-3 py-2 font-semibold text-gray-600 whitespace-nowrap ${isNumeric(c) ? "text-right" : "text-left"}`}
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
              {columns.map((col) => (
                <td
                  key={col}
                  className={`px-3 py-2 whitespace-nowrap ${isNumeric(col) ? "text-right font-mono" : "text-left"}`}
                >
                  {renderCell(col, row[col])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
