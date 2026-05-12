import { Check } from "lucide-react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const DOMAIN_PACKS = [
  { id: "none", label: "None" },
  { id: "fraud", label: "Fraud Detection" },
  { id: "aml", label: "AML Monitoring" },
];

const TYPOLOGIES = {
  fraud: ["card_not_present", "account_takeover", "synthetic_identity", "first_party_fraud"],
  aml: ["structuring", "fan_out", "fan_in", "scatter_gather", "circular_flow"],
  none: [],
};

export default function DomainConfig({ domainPack, typologies, onChange }) {
  const available = TYPOLOGIES[domainPack] || [];

  return (
    <div className="space-y-5">
      <div className="space-y-2.5">
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Domain Pack
        </Label>
        <div className="flex flex-wrap gap-2">
          {DOMAIN_PACKS.map((pack) => {
            const active = domainPack === pack.id;
            return (
              <button
                key={pack.id}
                onClick={() => onChange({ domainPack: pack.id, typologies: [] })}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium",
                  "transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active
                    ? "bg-primary/15 border-primary/40 text-primary"
                    : "bg-card border-border text-muted-foreground hover:border-border hover:bg-accent hover:text-foreground"
                )}
              >
                {active && <Check className="w-3.5 h-3.5 shrink-0" />}
                {pack.label}
              </button>
            );
          })}
        </div>
      </div>

      {available.length > 0 && (
        <div className="space-y-2.5">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Typologies
          </Label>
          <div className="flex flex-wrap gap-2">
            {available.map((typo) => {
              const active = typologies.includes(typo);
              return (
                <button
                  key={typo}
                  onClick={() => {
                    const updated = active
                      ? typologies.filter((t) => t !== typo)
                      : [...typologies, typo];
                    onChange({ domainPack, typologies: updated });
                  }}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-medium",
                    "transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring capitalize",
                    active
                      ? "bg-primary/15 border-primary/40 text-primary"
                      : "bg-card border-border text-muted-foreground hover:border-border hover:bg-accent hover:text-foreground"
                  )}
                >
                  {active && <Check className="w-3 h-3 shrink-0" />}
                  {typo.replace(/_/g, " ")}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
