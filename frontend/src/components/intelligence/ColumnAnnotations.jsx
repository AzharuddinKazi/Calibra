import { useState } from "react";

export default function ColumnAnnotations({ annotations, onAccept, onEdit, onReject }) {
  const [editStates, setEditStates] = useState({});

  if (!annotations || annotations.length === 0) return null;

  function handleEdit(name, field, value) {
    setEditStates((prev) => ({
      ...prev,
      [name]: { ...prev[name], [field]: value },
    }));
  }

  function handleAccept(col) {
    const edits = editStates[col.name] || {};
    onAccept({ ...col, ...edits });
  }

  return (
    <div className="space-y-3">
      {annotations.map((col) => (
        <div key={col.name} className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <p className="font-mono font-medium text-gray-800">{col.name}</p>
              <input
                type="text"
                defaultValue={col.semantic_label || ""}
                placeholder="Semantic label"
                className="mt-1 w-full text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                onChange={(e) => handleEdit(col.name, "semantic_label", e.target.value)}
              />
              {col.reasoning && (
                <p className="mt-1 text-xs text-gray-500 italic">{col.reasoning}</p>
              )}
            </div>
            <div className="flex gap-2 mt-1 shrink-0">
              <button
                onClick={() => handleAccept(col)}
                className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
              >
                Accept
              </button>
              <button
                onClick={() => onReject(col.name)}
                className="px-3 py-1 text-xs bg-gray-200 text-gray-600 rounded hover:bg-gray-300"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
