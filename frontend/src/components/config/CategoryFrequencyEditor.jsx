import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export default function CategoryFrequencyEditor({ column, frequencies, onSave, onClear }) {
  const inferredFreqs = column?.distribution_params?.frequencies ?? {};
  const categories = Object.keys(inferredFreqs);

  const [draft, setDraft] = useState(() => {
    if (frequencies && Object.keys(frequencies).length > 0) {
      return Object.fromEntries(
        categories.map((cat) => [cat, ((frequencies[cat] ?? inferredFreqs[cat] ?? 0) * 100).toFixed(2)])
      );
    }
    return Object.fromEntries(
      categories.map((cat) => [cat, (inferredFreqs[cat] * 100).toFixed(2)])
    );
  });

  useEffect(() => {
    if (frequencies && Object.keys(frequencies).length > 0) {
      setDraft(
        Object.fromEntries(
          categories.map((cat) => [cat, ((frequencies[cat] ?? inferredFreqs[cat] ?? 0) * 100).toFixed(2)])
        )
      );
    } else {
      setDraft(
        Object.fromEntries(
          categories.map((cat) => [cat, (inferredFreqs[cat] * 100).toFixed(2)])
        )
      );
    }
  }, [column?.name]);

  if (!column || categories.length === 0) return null;

  const total = categories.reduce((sum, cat) => sum + (parseFloat(draft[cat]) || 0), 0);
  const totalDisplay = total.toFixed(2);
  const isExact = Math.abs(total - 100) < 0.01;

  function handleNormalize() {
    if (total === 0) return;
    setDraft(
      Object.fromEntries(
        categories.map((cat) => [cat, ((parseFloat(draft[cat]) || 0) / total * 100).toFixed(2)])
      )
    );
  }

  function handleSave() {
    const normalized = Object.fromEntries(
      categories.map((cat) => [cat, (parseFloat(draft[cat]) || 0) / 100])
    );
    onSave(normalized);
  }

  function handleReset() {
    setDraft(
      Object.fromEntries(
        categories.map((cat) => [cat, (inferredFreqs[cat] * 100).toFixed(2)])
      )
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-semibold text-foreground">
          {column.name} — Frequency Editor
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Edit how often each category appears in the output
        </p>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Category</th>
              <th className="text-right px-4 py-2.5 font-semibold text-muted-foreground">Current %</th>
              <th className="text-right px-4 py-2.5 font-semibold text-muted-foreground">Override %</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((cat) => (
              <tr key={cat} className="border-b border-border/60">
                <td className="px-4 py-2.5 font-medium text-foreground">{cat}</td>
                <td className="px-4 py-2.5 text-right text-muted-foreground font-mono">
                  {(inferredFreqs[cat] * 100).toFixed(2)}%
                </td>
                <td className="px-4 py-2.5 text-right">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    className="h-7 text-xs w-24 text-right ml-auto font-mono"
                    value={draft[cat]}
                    onChange={(e) => setDraft((prev) => ({ ...prev, [cat]: e.target.value }))}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <span className={cn("text-xs font-mono font-medium", isExact ? "text-emerald-400" : "text-destructive")}>
          Total: {totalDisplay}%
        </span>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs"
          onClick={handleNormalize}
        >
          Normalize to 100%
        </Button>
      </div>

      <div className="flex gap-2">
        <Button
          size="sm"
          className="h-7 text-xs"
          disabled={!isExact}
          onClick={handleSave}
        >
          Save Frequencies
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs"
          onClick={handleReset}
        >
          Reset to inferred
        </Button>
        {frequencies && Object.keys(frequencies).length > 0 && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={onClear}
          >
            Clear Override
          </Button>
        )}
      </div>
    </div>
  );
}
