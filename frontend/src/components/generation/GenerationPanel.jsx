import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Zap } from "lucide-react";
import { generate } from "../../utils/api";

export default function GenerationPanel({ sessionId, domainPack, domainConfig, onGenerated }) {
  const [rowCount, setRowCount] = useState(10000);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleGenerate() {
    if (!sessionId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await generate({
        session_id: sessionId,
        row_count: rowCount,
        domain_pack: domainPack || "none",
        domain_config: domainConfig || {},
        random_seed: 42,
      });
      onGenerated(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="text-base">Generate Synthetic Dataset</CardTitle>
        <CardDescription>Configure the output size and trigger generation.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="row-count" className="text-sm font-medium">
            Number of rows
          </Label>
          <div className="flex items-center gap-3">
            <Input
              id="row-count"
              type="number"
              min={100}
              max={1000000}
              value={rowCount}
              onChange={(e) => setRowCount(Number(e.target.value))}
              className="w-40 font-mono"
            />
            <span className="text-sm text-muted-foreground">rows</span>
          </div>
        </div>

        <Button
          onClick={handleGenerate}
          disabled={loading || !sessionId}
          className={
            "w-full h-11 text-sm font-medium transition-all duration-200 " +
            "ring-offset-background hover:ring-2 hover:ring-primary/30 hover:ring-offset-1"
          }
        >
          {loading ? (
            <>
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
              Generating your dataset…
            </>
          ) : (
            <>
              <Zap className="mr-2 h-4 w-4" />
              Generate Dataset
            </>
          )}
        </Button>

        {error && (
          <Alert variant="destructive" className="border-destructive/30 bg-destructive/10">
            <AlertDescription className="text-destructive">{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
