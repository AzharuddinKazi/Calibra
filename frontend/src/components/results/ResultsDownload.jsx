export default function ResultsDownload({ result, onReplay }) {
  if (!result) return null;

  const { run_id, fidelity_score, constraint_failures, download_url, report_url } = result;
  const belowThreshold = fidelity_score !== null && fidelity_score < 0.75;

  return (
    <div className="max-w-lg mx-auto space-y-6 py-8">
      <div className="text-center">
        <h2 className="text-xl font-bold text-gray-900 mb-1">Dataset Ready</h2>
        <p className="text-xs font-mono text-gray-400">Run ID: {run_id}</p>
      </div>

      {fidelity_score !== null && (
        <div className={`rounded-xl p-4 ${belowThreshold ? "bg-red-50 border border-red-200" : "bg-green-50 border border-green-200"}`}>
          <p className={`text-sm font-medium ${belowThreshold ? "text-red-700" : "text-green-700"}`}>
            Fidelity Score: {(fidelity_score * 100).toFixed(1)}%
            {belowThreshold && " — below 75% threshold"}
          </p>
          {belowThreshold && (
            <p className="mt-1 text-xs text-red-600">
              Exercise caution. Review the audit report before using this dataset in a model pipeline.
            </p>
          )}
        </div>
      )}

      {constraint_failures > 0 && (
        <p className="text-sm text-gray-600">
          {constraint_failures.toLocaleString()} row(s) excluded due to constraint failures (expected behaviour).
        </p>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        {download_url && (
          <a
            href={download_url}
            className="flex-1 text-center px-5 py-3 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            Download Dataset (CSV)
          </a>
        )}
        {report_url && (
          <a
            href={report_url}
            target="_blank"
            rel="noreferrer"
            className="flex-1 text-center px-5 py-3 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
          >
            View Audit Report (PDF)
          </a>
        )}
      </div>

      <button
        onClick={() => onReplay?.(run_id)}
        className="w-full text-center text-sm text-gray-500 hover:text-gray-700 underline"
      >
        Replay this run
      </button>
    </div>
  );
}
