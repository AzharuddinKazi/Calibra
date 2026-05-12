import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function scoreVariant(v) {
  if (v >= 0.8) return "success";
  if (v >= 0.75) return "warning";
  return "destructive";
}

function scoreLabel(v) {
  if (v >= 0.8) return "Good";
  if (v >= 0.75) return "Acceptable";
  return "Below threshold";
}

function ScoreCard({ label, value, large }) {
  return (
    <Card>
      <CardContent className="pt-4 pb-4 space-y-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`font-bold tabular-nums ${large ? "text-3xl" : "text-xl"}`}>
          {(value * 100).toFixed(1)}%
        </p>
        <Badge variant={scoreVariant(value)} className="text-xs">{scoreLabel(value)}</Badge>
      </CardContent>
    </Card>
  );
}

export default function FidelityScoreCard({ fidelity }) {
  if (!fidelity) return null;
  return (
    <div className="grid grid-cols-3 gap-4">
      <ScoreCard label="Composite Score" value={fidelity.composite} large />
      <ScoreCard label="Column Fidelity" value={fidelity.column_fidelity} />
      <ScoreCard label="Correlation Fidelity" value={fidelity.correlation_fidelity} />
    </div>
  );
}
