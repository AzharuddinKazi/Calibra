import { useState } from "react";

export default function GenerationPanel({ sessionId, domainPack, domainConfig, onGenerated }) {
  const [rowCount, setRowCount] = useState(10000);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleGenerate() {
    if (!sessionId) return;
    setLoading(true);
    setError(null);
    try {
      const { generate } = await import("../../utils/api");
      const data = await generate({
        session_id: sessionId,
        row_count: rowCount,
        domain_pack: domainPack || "none",
        domain_config: domainConfig || {},
        random_seed: 42,
      });
      onGenerated(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Number of Rows</label>
        <input
          type="number"
          min="100"
          max="1000000"
          value={rowCount}
          onChange={(e) => setRowCount(Number(e.target.value))}
          className="w-40 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <button
        onClick={handleGenerate}
        disabled={loading || !sessionId}
        className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Generating…" : "Generate Dataset"}
      </button>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
