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
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Generate Dataset</CardTitle>
        <CardDescription>Configure the output size and trigger generation.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="row-count">Number of rows</Label>
          <div className="flex items-center gap-3">
            <Input
              id="row-count"
              type="number"
              min={100}
              max={1000000}
              value={rowCount}
              onChange={(e) => setRowCount(Number(e.target.value))}
              className="w-40"
            />
            <span className="text-sm text-muted-foreground">rows</span>
          </div>
        </div>

        <Button onClick={handleGenerate} disabled={loading || !sessionId} className="w-full sm:w-auto">
          <Zap className="mr-2 h-4 w-4" />
          {loading ? "Generating…" : "Generate Dataset"}
        </Button>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
