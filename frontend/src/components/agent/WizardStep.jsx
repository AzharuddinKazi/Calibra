import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function detectInputType(text) {
  const lower = text.toLowerCase();
  if (/\b(how many|number of|rows|count)\b/.test(lower)) return "number";
  if (/\b(fraud|aml|none|domain|pack)\b/.test(lower)) return "domain";
  return "text";
}

export default function WizardStep({ step, message, onAnswer, isLoading }) {
  const [value, setValue] = useState("");
  const inputType = detectInputType(message);

  function handleSubmit(e) {
    e.preventDefault();
    if (value.trim()) { onAnswer(value.trim()); setValue(""); }
  }

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Step {step}</div>
        <p className="text-sm leading-relaxed">{message}</p>

        {inputType === "domain" && (
          <div className="flex flex-wrap gap-2">
            {["fraud", "aml", "none"].map((opt) => (
              <Button key={opt} variant="outline" size="sm" className="capitalize" disabled={isLoading} onClick={() => onAnswer(opt)}>
                {opt}
              </Button>
            ))}
          </div>
        )}

        {inputType !== "domain" && (
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              type={inputType === "number" ? "number" : "text"}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={inputType === "number" ? "10000" : "Your answer…"}
              disabled={isLoading}
              className="flex-1"
              min={inputType === "number" ? 100 : undefined}
            />
            <Button type="submit" size="sm" disabled={isLoading || !value.trim()}>Continue</Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
