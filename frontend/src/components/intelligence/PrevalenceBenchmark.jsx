import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

export default function PrevalenceBenchmark({ annotation, onApply }) {
  if (!annotation?.recommended_domain_pack || annotation.recommended_domain_pack === "none") return null;

  const domainPack = annotation.recommended_domain_pack;
  const defaults = domainPack === "fraud"
    ? { fraud: 0.02, non_fraud: 0.98 }
    : { sar: 0.005, non_sar: 0.995 };

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          AI-Suggested Prevalence
          <span className="capitalize text-muted-foreground font-normal">({domainPack} pack)</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(defaults).map(([cls, val]) => (
            <div key={cls} className="text-sm flex justify-between">
              <span className="capitalize text-muted-foreground">{cls.replace("_", " ")}</span>
              <span className="font-medium">{(val * 100).toFixed(1)}%</span>
            </div>
          ))}
        </div>
        <Button size="sm" variant="outline" onClick={() => onApply(defaults)}>
          Use These Defaults
        </Button>
      </CardContent>
    </Card>
  );
}
