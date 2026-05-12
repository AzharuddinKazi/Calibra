import { useState, useRef } from "react";
import { uploadCSV } from "../../utils/api";

export default function Upload({ onUploadComplete }) {
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  function handleDragOver(e) {
    e.preventDefault();
    setDragging(true);
  }

  function handleDragLeave() {
    setDragging(false);
  }

  async function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) await processFile(file);
  }

  async function handleChange(e) {
    const file = e.target.files[0];
    if (file) await processFile(file);
  }

  async function processFile(file) {
    if (!file.name.endsWith(".csv")) {
      setError("Only CSV files are accepted.");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setError("File size must be under 50 MB.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const data = await uploadCSV(file);
      onUploadComplete(data, file.name);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors
          ${dragging ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-blue-400 hover:bg-gray-50"}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={handleChange}
        />
        {loading ? (
          <p className="text-gray-500 text-sm">Uploading and profiling...</p>
        ) : (
          <>
            <p className="text-lg font-medium text-gray-700 mb-2">
              Drop your CSV file here
            </p>
            <p className="text-sm text-gray-500">or click to browse</p>
            <p className="text-xs text-gray-400 mt-3">CSV only · max 50 MB</p>
          </>
        )}
      </div>
      {error && (
        <p className="mt-3 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
