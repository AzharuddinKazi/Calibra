import { useState, useRef } from "react";
import { UploadCloud, FileText, AlertCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { uploadCSV } from "../../utils/api";

export default function Upload({ onUploadComplete }) {
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  function handleDragOver(e) {
    e.preventDefault();
    setDragging(true);
  }

  function handleDragLeave(e) {
    e.preventDefault();
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
    setSelectedFile(file);
  }

  async function handleUpload() {
    if (!selectedFile) return;
    setLoading(true);
    setError(null);
    try {
      const data = await uploadCSV(selectedFile);
      onUploadComplete(data, selectedFile.name);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !loading && !selectedFile && inputRef.current?.click()}
        className={cn(
          "relative rounded-xl border-2 border-dashed transition-all duration-200",
          "flex flex-col items-center justify-center py-24 gap-5",
          !selectedFile && !loading && "cursor-pointer",
          dragging
            ? "border-primary bg-primary/5 shadow-[0_0_0_4px_hsl(var(--primary)/0.08)]"
            : selectedFile
            ? "border-emerald-500/40 bg-emerald-500/5 cursor-default"
            : "border-border bg-card hover:border-primary/40 hover:bg-accent/30"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={handleChange}
        />

        {loading ? (
          <>
            <div className="w-14 h-14 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
              <div className="w-6 h-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
            <div className="text-center space-y-1.5">
              <p className="text-sm font-medium text-foreground">Uploading and profiling your dataset…</p>
              <p className="text-xs text-muted-foreground">This may take a moment</p>
            </div>
          </>
        ) : selectedFile ? (
          <>
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <FileText className="w-6 h-6 text-emerald-400" />
            </div>
            <div className="text-center space-y-1.5">
              <p className="text-sm font-semibold text-foreground">{selectedFile.name}</p>
              <p className="text-xs text-muted-foreground font-mono">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedFile(null);
              }}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mt-1"
            >
              <X className="w-3 h-3" />
              Choose a different file
            </button>
          </>
        ) : (
          <>
            <div className="w-14 h-14 rounded-full bg-muted border border-border flex items-center justify-center">
              <UploadCloud className="w-7 h-7 text-muted-foreground" />
            </div>
            <div className="text-center space-y-2">
              <p className="font-medium text-sm text-foreground">
                Drop your CSV here, or{" "}
                <span className="text-primary underline underline-offset-2">click to browse</span>
              </p>
              <p className="text-xs text-muted-foreground">Maximum 50 MB · CSV files only</p>
            </div>
          </>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3">
          <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {selectedFile && !loading && (
        <Button
          onClick={handleUpload}
          className="w-full h-11 text-sm font-medium"
          size="lg"
        >
          <UploadCloud className="mr-2 h-4 w-4" />
          Upload and Analyse
        </Button>
      )}
    </div>
  );
}
