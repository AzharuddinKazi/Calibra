import { useState } from "react";

export default function ConfirmGenerate({ config, onGenerate }) {
  const [rowCount, setRowCount] = useState(config?.row_count || 10000);
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      await onGenerate(rowCount);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="border border-green-300 rounded-xl bg-green-50 p-4">
      <p className="text-sm font-medium text-green-800 mb-3">
        Configuration complete — ready to generate.
      </p>
      <div className="flex items-center gap-3">
        <input
          type="number"
          min="100"
          max="1000000"
          value={rowCount}
          onChange={(e) => setRowCount(Number(e.target.value))}
          className="w-36 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
        />
        <span className="text-sm text-gray-600">rows</span>
        <button
          onClick={handleClick}
          disabled={loading}
          className="px-5 py-2 text-sm font-semibold bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Generating…" : "Generate Dataset"}
        </button>
      </div>
    </div>
  );
}
