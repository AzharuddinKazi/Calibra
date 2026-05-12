import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Zap, CheckCircle2 } from "lucide-react";

export default function ConfirmGenerate({ config, onGenerate }) {
  const [rowCount, setRowCount] = useState(config?.row_count || 10000);
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      await onGenerate(rowCount);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
        <p className="text-sm font-medium text-emerald-300">Configuration complete — ready to generate</p>
      </div>
      <div className="flex items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="final-rows" className="text-xs text-muted-foreground">
            Row count
          </Label>
          <Input
            id="final-rows"
            type="number"
            min={100}
            max={1000000}
            value={rowCount}
            onChange={(e) => setRowCount(Number(e.target.value))}
            className="w-36 h-9 font-mono"
          />
        </div>
        <Button
          onClick={handleClick}
          disabled={loading}
          className="h-9 bg-emerald-600 hover:bg-emerald-500 text-white border-0"
        >
          {loading ? (
            <>
              <div className="mr-2 h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Generating…
            </>
          ) : (
            <>
              <Zap className="mr-2 h-3.5 w-3.5" />
              Generate Dataset
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
