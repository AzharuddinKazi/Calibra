export default function ConstraintList({ constraints, onDelete }) {
  if (!constraints || constraints.length === 0) {
    return (
      <p className="text-sm text-gray-500 italic">No constraints added yet.</p>
    );
  }

  return (
    <ul className="space-y-2">
      {constraints.map((c, i) => (
        <li
          key={i}
          className="flex items-start justify-between gap-3 border border-gray-200 rounded-lg px-4 py-3"
        >
          <div className="flex-1">
            <span className="inline-block text-xs bg-gray-100 text-gray-600 rounded px-2 py-0.5 mr-2">
              {c.rule_type}
            </span>
            <span className="text-sm text-gray-800">
              {c.readable_summary || `${c.column || c.columns?.join(", ") || "—"}`}
            </span>
            <span className="ml-2 text-xs text-gray-400">({c.source})</span>
          </div>
          <button
            onClick={() => onDelete(i)}
            className="text-xs text-red-500 hover:text-red-700 shrink-0"
          >
            Remove
          </button>
        </li>
      ))}
    </ul>
  );
}
