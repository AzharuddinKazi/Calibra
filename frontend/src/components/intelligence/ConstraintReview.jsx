export default function ConstraintReview({ parsed, onConfirm, onDiscard }) {
  if (!parsed) return null;

  const { constraint, readable_summary, message } = parsed;

  if (!constraint || !constraint.parseable) {
    return (
      <div className="border border-red-200 rounded-lg p-4 bg-red-50">
        <p className="text-sm text-red-700">
          {message || constraint?.parse_error || "Could not parse constraint."}
        </p>
        <button
          onClick={onDiscard}
          className="mt-2 px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
        >
          Dismiss
        </button>
      </div>
    );
  }

  const isLowConfidence = constraint.confidence === "low";

  return (
    <div className={`border rounded-lg p-4 ${isLowConfidence ? "border-yellow-300 bg-yellow-50" : "border-green-200 bg-green-50"}`}>
      <p className="text-sm font-medium text-gray-800">{readable_summary}</p>
      {isLowConfidence && (
        <p className="mt-1 text-xs text-yellow-700">
          We made some assumptions — please review before confirming.
        </p>
      )}
      <div className="mt-3 flex gap-2">
        <button
          onClick={onConfirm}
          className={`px-3 py-1 text-xs text-white rounded ${isLowConfidence ? "bg-yellow-600 hover:bg-yellow-700" : "bg-green-600 hover:bg-green-700"}`}
        >
          Confirm
        </button>
        <button
          onClick={onDiscard}
          className="px-3 py-1 text-xs bg-gray-200 text-gray-600 rounded hover:bg-gray-300"
        >
          Discard
        </button>
      </div>
    </div>
  );
}
