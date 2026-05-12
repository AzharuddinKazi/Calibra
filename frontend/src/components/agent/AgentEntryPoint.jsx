export default function AgentEntryPoint({ onSelectMode }) {
  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">
        Calibra Synthetic Data Engine
      </h1>
      <p className="text-gray-500 text-center mb-10">
        Generate synthetic financial crime datasets with configurable domain constraints.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <button
          onClick={() => onSelectMode("agent_first", "chat")}
          className="group border-2 border-gray-200 rounded-xl p-6 text-left hover:border-blue-400 hover:bg-blue-50 transition-colors"
        >
          <div className="text-2xl mb-3">💬</div>
          <h2 className="font-semibold text-gray-800 mb-1">Describe what you need</h2>
          <p className="text-sm text-gray-500">
            Chat with the agent to configure your dataset. It'll ask the right questions and set everything up.
          </p>
        </button>

        <button
          onClick={() => onSelectMode("upload_first", "upload")}
          className="group border-2 border-gray-200 rounded-xl p-6 text-left hover:border-blue-400 hover:bg-blue-50 transition-colors"
        >
          <div className="text-2xl mb-3">📂</div>
          <h2 className="font-semibold text-gray-800 mb-1">Upload your dataset</h2>
          <p className="text-sm text-gray-500">
            Upload a sample CSV. Calibra learns its structure and generates synthetic data at scale.
          </p>
        </button>
      </div>
    </div>
  );
}
