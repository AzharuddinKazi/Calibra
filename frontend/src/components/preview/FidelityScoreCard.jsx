function Score({ label, value, large = false }) {
  const color = value >= 0.8 ? "green" : value >= 0.75 ? "yellow" : "red";
  const colorClasses = {
    green: { bg: "bg-green-50", text: "text-green-700", badge: "text-green-800" },
    yellow: { bg: "bg-yellow-50", text: "text-yellow-700", badge: "text-yellow-800" },
    red: { bg: "bg-red-50", text: "text-red-700", badge: "text-red-800" },
  };
  const labels = {
    green: "Good",
    yellow: "Acceptable",
    red: "Below threshold",
  };
  const c = colorClasses[color];

  return (
    <div className={`${c.bg} rounded-xl p-4 flex flex-col`}>
      <span className="text-xs text-gray-500 mb-1">{label}</span>
      <span className={`font-bold ${large ? "text-3xl" : "text-xl"} ${c.text}`}>
        {(value * 100).toFixed(1)}%
      </span>
      <span className={`text-xs mt-1 font-medium ${c.badge}`}>{labels[color]}</span>
    </div>
  );
}

export default function FidelityScoreCard({ fidelity }) {
  if (!fidelity) return null;
  return (
    <div className="grid grid-cols-3 gap-4 mb-6">
      <Score label="Composite Score" value={fidelity.composite} large />
      <Score label="Column Fidelity" value={fidelity.column_fidelity} />
      <Score label="Correlation Fidelity" value={fidelity.correlation_fidelity} />
    </div>
  );
}
