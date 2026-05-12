import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Zap } from "lucide-react";

export default function ConfirmGenerate({ config, onGenerate }) {
  const [rowCount, setRowCount] = useState(config?.row_count || 10000);
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try { await onGenerate(rowCount); } finally { setLoading(false); }
  }

  return (
    <Card className="border-green-200 bg-green-50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm text-green-800">Configuration complete — ready to generate</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3">
          <div className="space-y-1">
            <Label htmlFor="final-rows" className="text-xs">Row count</Label>
            <Input
              id="final-rows"
              type="number"
              min={100}
              max={1000000}
              value={rowCount}
              onChange={(e) => setRowCount(Number(e.target.value))}
              className="w-36 h-8"
            />
          </div>
          <Button onClick={handleClick} disabled={loading} className="mt-5 bg-green-700 hover:bg-green-800">
            <Zap className="mr-2 h-4 w-4" />
            {loading ? "Generating…" : "Generate Dataset"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
