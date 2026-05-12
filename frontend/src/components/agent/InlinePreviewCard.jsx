import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getPreview } from "../../utils/api";

function FidelityBadge({ score }) {
  const variant = score >= 0.8 ? "success" : score >= 0.75 ? "warning" : "destructive";
  return <Badge variant={variant}>Fidelity: {(score * 100).toFixed(0)}%</Badge>;
}

export default function InlinePreviewCard({ runId, onViewFull }) {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!runId) return;
    getPreview(runId)
      .then(setPreview)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [runId]);

  if (loading) return <div className="text-xs text-muted-foreground animate-pulse py-2">Loading preview…</div>;
  if (error) return <div className="text-xs text-destructive">Preview unavailable.</div>;
  if (!preview) return null;

  const sampleRows = (preview.sample_rows || []).slice(0, 5);
  const cols = sampleRows.length > 0 ? Object.keys(sampleRows[0]).slice(0, 4) : [];

  return (
    <Card className="border-muted">
      <CardHeader className="py-3 px-4 flex-row items-center justify-between space-y-0">
        <FidelityBadge score={preview.fidelity.composite} />
        <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => onViewFull?.(runId)}>
          View full preview →
        </Button>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        {preview.prevalence && (
          <div className="flex gap-3">
            {Object.entries(preview.prevalence.actual || {}).map(([cls, val]) => (
              <span key={cls} className="text-xs text-muted-foreground">
                <span className="capitalize">{cls.replace("_", " ")}</span>: {(val * 100).toFixed(2)}%
              </span>
            ))}
          </div>
        )}
        {sampleRows.length > 0 && (
          <div className="overflow-x-auto rounded border">
            <table className="text-xs w-full">
              <thead className="bg-muted">
                <tr>
                  {cols.map((c) => <th key={c} className="text-left px-3 py-1.5 font-medium text-muted-foreground">{c}</th>)}
                </tr>
              </thead>
              <tbody>
                {sampleRows.map((row, i) => (
                  <tr key={i} className="border-t">
                    {cols.map((c) => <td key={c} className="px-3 py-1.5">{String(row[c])}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
