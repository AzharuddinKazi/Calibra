const DOMAIN_PACKS = ["fraud", "aml", "none"];

const TYPOLOGY_OPTIONS = {
  fraud: ["card_not_present", "account_takeover", "synthetic_identity", "first_party_fraud"],
  aml: ["structuring", "fan_out", "fan_in", "scatter_gather", "circular_flow"],
  none: [],
};

export default function DomainConfig({ domainPack, typologies, onChange }) {
  const availableTypologies = TYPOLOGY_OPTIONS[domainPack] || [];

  function handlePackChange(pack) {
    onChange({ domainPack: pack, typologies: [] });
  }

  function handleTypologyToggle(typo) {
    const updated = typologies.includes(typo)
      ? typologies.filter((t) => t !== typo)
      : [...typologies, typo];
    onChange({ domainPack, typologies: updated });
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Domain Pack</label>
        <div className="flex gap-2">
          {DOMAIN_PACKS.map((pack) => (
            <button
              key={pack}
              onClick={() => handlePackChange(pack)}
              className={`px-4 py-2 text-sm rounded-lg capitalize border transition-colors
                ${domainPack === pack
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-700 border-gray-300 hover:border-blue-400"}`}
            >
              {pack}
            </button>
          ))}
        </div>
      </div>

      {availableTypologies.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Typologies</label>
          <div className="flex flex-wrap gap-2">
            {availableTypologies.map((typo) => (
              <button
                key={typo}
                onClick={() => handleTypologyToggle(typo)}
                className={`px-3 py-1 text-xs rounded-full border transition-colors
                  ${typologies.includes(typo)
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white text-gray-600 border-gray-300 hover:border-indigo-400"}`}
              >
                {typo.replace(/_/g, " ")}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
