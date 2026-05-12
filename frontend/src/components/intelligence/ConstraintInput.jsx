export default function ConstraintInput({ sessionId, onParse, loading }) {
  function handleSubmit(e) {
    e.preventDefault();
    const text = e.target.constraint.value.trim();
    if (text) onParse(sessionId, text);
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        name="constraint"
        type="text"
        placeholder='e.g. "amount must be between 0.01 and 50,000"'
        className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
        disabled={loading}
      />
      <button
        type="submit"
        disabled={loading}
        className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Parsing…" : "Parse"}
      </button>
    </form>
  );
}
