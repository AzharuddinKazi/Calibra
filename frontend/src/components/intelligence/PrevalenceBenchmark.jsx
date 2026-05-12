export default function PrevalenceBenchmark({ annotation, onApply }) {
  if (!annotation?.recommended_domain_pack || annotation.recommended_domain_pack === "none") {
    return null;
  }

  const domainPack = annotation.recommended_domain_pack;
  const defaults = domainPack === "fraud"
    ? { fraud: 0.02, non_fraud: 0.98 }
    : { sar: 0.005, non_sar: 0.995 };

  return (
    <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
      <p className="text-sm font-medium text-blue-800 mb-2">
        Suggested Prevalence for <span className="capitalize">{domainPack}</span> Pack
      </p>
      <div className="space-y-1">
        {Object.entries(defaults).map(([cls, val]) => (
          <div key={cls} className="flex justify-between text-sm text-blue-700">
            <span className="capitalize">{cls.replace("_", " ")}</span>
            <span>{(val * 100).toFixed(1)}%</span>
          </div>
        ))}
      </div>
      <button
        onClick={() => onApply(defaults)}
        className="mt-3 px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Use These Defaults
      </button>
    </div>
  );
}
