export default function PrevalenceSlider({ domainPack, prevalence, onChange }) {
  if (!domainPack || domainPack === "none") return null;

  const classes = domainPack === "fraud"
    ? ["fraud", "non_fraud"]
    : ["sar", "non_sar"];

  const current = prevalence || Object.fromEntries(classes.map((c, i) => [c, i === 0 ? 0.02 : 0.98]));

  function handleChange(cls, value) {
    const floatVal = Math.min(1, Math.max(0, parseFloat(value) / 100));
    const other = classes.find((c) => c !== cls);
    onChange({ ...current, [cls]: floatVal, [other]: parseFloat((1 - floatVal).toFixed(6)) });
  }

  const minorityClass = classes[0];
  const minorVal = (current[minorityClass] || 0) * 100;

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">
        Prevalence — {minorityClass.replace("_", " ")} rate
      </label>
      <div className="flex items-center gap-4">
        <input
          type="range"
          min="0.1"
          max="20"
          step="0.1"
          value={minorVal}
          onChange={(e) => handleChange(minorityClass, e.target.value)}
          className="flex-1"
        />
        <span className="text-sm font-mono w-16 text-right">{minorVal.toFixed(1)}%</span>
      </div>
      <div className="text-xs text-gray-500 space-y-0.5">
        {classes.map((cls) => (
          <div key={cls} className="flex justify-between">
            <span className="capitalize">{cls.replace("_", " ")}</span>
            <span>{((current[cls] || 0) * 100).toFixed(2)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
