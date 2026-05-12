import { useState, useEffect } from "react";
import { getPreview } from "../../utils/api";
import FidelityScoreCard from "./FidelityScoreCard";
import DistributionChart from "./DistributionChart";
import CorrelationHeatmap from "./CorrelationHeatmap";
import PrevalenceBar from "./PrevalenceBar";
import SampleTable from "./SampleTable";

const TABS = ["Distributions", "Correlation", "Prevalence", "Sample Data"];

export default function DataPreview({ runId }) {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [selectedColumn, setSelectedColumn] = useState(0);

  useEffect(() => {
    if (!runId) return;
    getPreview(runId)
      .then(setPreview)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [runId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-gray-400 animate-pulse">
        Loading preview…
      </div>
    );
  }
  if (error) {
    return <div className="text-sm text-red-600 p-4">Failed to load preview: {error}</div>;
  }
  if (!preview) return null;

  return (
    <div className="space-y-6">
      <FidelityScoreCard fidelity={preview.fidelity} />

      <div className="border-b border-gray-200">
        <nav className="flex gap-1">
          {TABS.map((tab, i) => (
            <button
              key={tab}
              onClick={() => setActiveTab(i)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors
                ${activeTab === i
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"}`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      <div className="pt-2">
        {activeTab === 0 && (
          <div className="space-y-4">
            {preview.columns?.length > 0 && (
              <div>
                <select
                  value={selectedColumn}
                  onChange={(e) => setSelectedColumn(Number(e.target.value))}
                  className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {preview.columns.map((col, i) => (
                    <option key={col.name} value={i}>{col.name}</option>
                  ))}
                </select>
              </div>
            )}
            {preview.columns?.[selectedColumn] && (
              <DistributionChart column={preview.columns[selectedColumn]} />
            )}
          </div>
        )}
        {activeTab === 1 && <CorrelationHeatmap correlation={preview.correlation} />}
        {activeTab === 2 && <PrevalenceBar prevalence={preview.prevalence} />}
        {activeTab === 3 && <SampleTable rows={preview.sample_rows} />}
      </div>
    </div>
  );
}
