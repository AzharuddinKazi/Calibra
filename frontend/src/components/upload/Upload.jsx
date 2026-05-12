import { useState, useRef } from "react";
import { Upload as UploadIcon, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { uploadCSV } from "../../utils/api";
import { cn } from "@/lib/utils";

export default function Upload({ onUploadComplete }) {
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  function handleDragOver(e) { e.preventDefault(); setDragging(true); }
  function handleDragLeave() { setDragging(false); }

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
    if (!file.name.endsWith(".csv")) { setError("Only CSV files are accepted."); return; }
    if (file.size > 50 * 1024 * 1024) { setError("File size must be under 50 MB."); return; }
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
    <div className="space-y-4">
      <Card
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !loading && inputRef.current?.click()}
        className={cn(
          "cursor-pointer transition-colors border-2 border-dashed",
          dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/50"
        )}
      >
        <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
          <input ref={inputRef} type="file" accept=".csv" className="hidden" onChange={handleChange} />
          <div className="rounded-full bg-muted p-4">
            {loading ? (
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            ) : (
              <UploadIcon className="h-8 w-8 text-muted-foreground" />
            )}
          </div>
          {loading ? (
            <p className="text-sm text-muted-foreground">Uploading and profiling your dataset…</p>
          ) : (
            <div className="text-center">
              <p className="font-medium">Drop your CSV file here</p>
              <p className="text-sm text-muted-foreground mt-1">or click to browse</p>
              <p className="text-xs text-muted-foreground mt-3">CSV only · max 50 MB</p>
            </div>
          )}
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
