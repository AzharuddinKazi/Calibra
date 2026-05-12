function Field({ label, value, required = false }) {
  const isUnset = value === null || value === undefined || value === "";
  return (
    <div className="flex justify-between items-start py-2 border-b border-gray-100 last:border-0">
      <span className="text-xs text-gray-500 flex items-center gap-1">
        {required && isUnset && (
          <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" title="Required" />
        )}
        {label}
      </span>
      <span className={`text-xs font-medium ${isUnset ? "text-gray-400 italic" : "text-gray-800"}`}>
        {isUnset ? "not set" : String(value)}
      </span>
    </div>
  );
}

export default function ConfigSummaryPanel({ config }) {
  if (!config) return null;

  const { domain_pack, typologies, row_count, prevalence, constraints } = config;
  const prevSummary = prevalence
    ? Object.entries(prevalence).map(([k, v]) => `${k}: ${(v * 100).toFixed(1)}%`).join(", ")
    : null;

  return (
    <div className="border border-gray-200 rounded-xl bg-white p-4 shadow-sm">
      <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">
        Current Configuration
      </h3>
      <Field label="Domain Pack" value={domain_pack} required />
      <Field label="Typologies" value={typologies?.join(", ") || null} />
      <Field label="Prevalence" value={prevSummary} required />
      <Field label="Row Count" value={row_count ? row_count.toLocaleString() : null} required />
      <Field label="Constraints" value={constraints?.length ? `${constraints.length} active` : null} />
      {config.ready_to_generate && (
        <div className="mt-3 text-xs text-green-700 bg-green-50 rounded-lg px-3 py-2">
          ✓ Configuration complete — ready to generate
        </div>
      )}
    </div>
  );
}
