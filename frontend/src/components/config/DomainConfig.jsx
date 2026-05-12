import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";

const DOMAIN_PACKS = ["fraud", "aml", "none"];
const TYPOLOGIES = {
  fraud: ["card_not_present", "account_takeover", "synthetic_identity", "first_party_fraud"],
  aml: ["structuring", "fan_out", "fan_in", "scatter_gather", "circular_flow"],
  none: [],
};

export default function DomainConfig({ domainPack, typologies, onChange }) {
  const available = TYPOLOGIES[domainPack] || [];

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Domain Pack</Label>
        <div className="flex flex-wrap gap-2">
          {DOMAIN_PACKS.map((pack) => (
            <Button
              key={pack}
              variant={domainPack === pack ? "default" : "outline"}
              size="sm"
              className="capitalize"
              onClick={() => onChange({ domainPack: pack, typologies: [] })}
            >
              {pack}
            </Button>
          ))}
        </div>
      </div>

      {available.length > 0 && (
        <div className="space-y-2">
          <Label>Typologies</Label>
          <div className="flex flex-wrap gap-2">
            {available.map((typo) => {
              const active = typologies.includes(typo);
              return (
                <button
                  key={typo}
                  onClick={() => {
                    const updated = active ? typologies.filter((t) => t !== typo) : [...typologies, typo];
                    onChange({ domainPack, typologies: updated });
                  }}
                  className="focus:outline-none"
                >
                  <Badge
                    variant={active ? "default" : "outline"}
                    className="cursor-pointer capitalize"
                  >
                    {typo.replace(/_/g, " ")}
                  </Badge>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
