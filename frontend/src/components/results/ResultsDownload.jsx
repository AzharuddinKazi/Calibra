import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, CheckCircle2, Download, FileText, RefreshCw } from "lucide-react";

export default function ResultsDownload({ result, onReplay }) {
  if (!result) return null;

  const { run_id, fidelity_score, constraint_failures, download_url, report_url } = result;
  const belowThreshold = fidelity_score !== null && fidelity_score < 0.75;

  function scoreVariant() {
    if (fidelity_score === null) return "secondary";
    if (fidelity_score >= 0.80) return "success";
    if (fidelity_score >= 0.75) return "warning";
    return "destructive";
  }

  return (
    <div className="max-w-lg mx-auto space-y-6 py-8">
      <div className="text-center space-y-1">
        <div className="flex items-center justify-center gap-2">
          <CheckCircle2 className="h-6 w-6 text-green-600" />
          <h2 className="text-xl font-bold">Dataset Ready</h2>
        </div>
        <p className="text-xs font-mono text-muted-foreground">Run ID: {run_id}</p>
      </div>

      {fidelity_score !== null && (
        <Card>
          <CardContent className="py-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">Fidelity Score</p>
              <p className="text-xs text-muted-foreground">
                {fidelity_score >= 0.80
                  ? "Excellent — suitable for model training"
                  : fidelity_score >= 0.75
                  ? "Acceptable — review before use"
                  : "Below threshold — exercise caution"}
              </p>
            </div>
            <Badge variant={scoreVariant()} className="text-base px-3 py-1">
              {(fidelity_score * 100).toFixed(1)}%
            </Badge>
          </CardContent>
        </Card>
      )}

      {belowThreshold && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Fidelity score is below the 75% threshold. Review the audit report before using this
            dataset in a model training pipeline.
          </AlertDescription>
        </Alert>
      )}

      {constraint_failures > 0 && (
        <Alert>
          <AlertDescription>
            {constraint_failures.toLocaleString()} row(s) excluded due to constraint validation
            failures. This is expected behaviour — see the audit report for details.
          </AlertDescription>
        </Alert>
      )}

      <Separator />

      <div className="flex flex-col sm:flex-row gap-3">
        {download_url && (
          <Button asChild className="flex-1">
            <a href={download_url} download>
              <Download className="mr-2 h-4 w-4" />
              Download Dataset (CSV)
            </a>
          </Button>
        )}
        {report_url && (
          <Button asChild variant="outline" className="flex-1">
            <a href={report_url} target="_blank" rel="noreferrer">
              <FileText className="mr-2 h-4 w-4" />
              Audit Report (PDF)
            </a>
          </Button>
        )}
      </div>

      <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => onReplay?.(run_id)}>
        <RefreshCw className="mr-2 h-4 w-4" />
        Replay this run
      </Button>
    </div>
  );
}
