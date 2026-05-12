export default function WizardStep({ step, message, onAnswer, isLoading }) {
  function detectInputType(text) {
    const lower = text.toLowerCase();
    if (/\b(how many|number of|rows|count)\b/.test(lower)) return "number";
    if (/\b(fraud|aml|none|domain|pack)\b/.test(lower)) return "domain-select";
    if (/\b(typolog|type of fraud)\b/.test(lower)) return "text";
    return "text";
  }

  const inputType = detectInputType(message);

  function handleSubmit(e) {
    e.preventDefault();
    const value = e.target.answer?.value || e.target.domainPack?.value;
    if (value) onAnswer(value);
  }

  return (
    <div className="border border-gray-200 rounded-xl p-6 bg-white shadow-sm">
      <div className="text-xs text-gray-400 mb-3">Step {step}</div>
      <p className="text-sm text-gray-800 mb-4 leading-relaxed">{message}</p>

      <form onSubmit={handleSubmit}>
        {inputType === "number" && (
          <div className="flex gap-2">
            <input
              name="answer"
              type="number"
              min="100"
              placeholder="10000"
              className="w-40 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              Continue
            </button>
          </div>
        )}

        {inputType === "domain-select" && (
          <div className="flex gap-2 flex-wrap">
            {["fraud", "aml", "none"].map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => onAnswer(opt)}
                disabled={isLoading}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg capitalize hover:border-blue-400 hover:bg-blue-50 disabled:opacity-50"
              >
                {opt}
              </button>
            ))}
          </div>
        )}

        {inputType === "text" && (
          <div className="flex gap-2">
            <input
              name="answer"
              type="text"
              placeholder="Your answer…"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              Continue
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
