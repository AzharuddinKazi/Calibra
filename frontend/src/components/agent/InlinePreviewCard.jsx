import { useState, useEffect } from "react";
import { getPreview } from "../../utils/api";

function FidelityBadge({ score }) {
  const color = score >= 0.8 ? "green" : score >= 0.75 ? "yellow" : "red";
  const classes = {
    green: "bg-green-100 text-green-800",
    yellow: "bg-yellow-100 text-yellow-800",
    red: "bg-red-100 text-red-800",
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${classes[color]}`}>
      Fidelity: {(score * 100).toFixed(0)}%
    </span>
  );
}

export default function InlinePreviewCard({ runId, onViewFull }) {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!runId) return;
    getPreview(runId)
      .then(setPreview)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [runId]);

  if (loading) return <div className="text-xs text-gray-400 animate-pulse">Loading preview…</div>;
  if (error) return <div className="text-xs text-red-500">Preview unavailable.</div>;
  if (!preview) return null;

  const sampleRows = (preview.sample_rows || []).slice(0, 5);
  const cols = sampleRows.length > 0 ? Object.keys(sampleRows[0]).slice(0, 4) : [];

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 space-y-3 text-sm">
      <div className="flex items-center justify-between">
        <FidelityBadge score={preview.fidelity.composite} />
        <button onClick={() => onViewFull(runId)} className="text-xs text-blue-600 hover:underline">
          View full preview →
        </button>
      </div>

      {preview.prevalence && (
        <div className="flex gap-3">
          {Object.entries(preview.prevalence.actual || {}).map(([cls, val]) => (
            <div key={cls} className="text-xs text-gray-600">
              <span className="capitalize">{cls.replace("_", " ")}</span>: {(val * 100).toFixed(2)}%
            </div>
          ))}
        </div>
      )}

      {sampleRows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="text-xs w-full">
            <thead>
              <tr>
                {cols.map((c) => (
                  <th key={c} className="text-left text-gray-500 pr-4 pb-1 font-normal">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sampleRows.map((row, i) => (
                <tr key={i}>
                  {cols.map((c) => (
                    <td key={c} className="text-gray-700 pr-4 py-0.5">{String(row[c])}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
