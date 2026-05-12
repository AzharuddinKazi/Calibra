import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";

export default function PrevalenceSlider({ domainPack, prevalence, onChange }) {
  if (!domainPack || domainPack === "none") return null;

  const classes = domainPack === "fraud" ? ["fraud", "non_fraud"] : ["sar", "non_sar"];
  const current = prevalence || { [classes[0]]: 0.02, [classes[1]]: 0.98 };
  const minorClass = classes[0];
  const minorVal = (current[minorClass] || 0) * 100;

  function handleChange([val]) {
    const floatVal = val / 100;
    const other = classes[1];
    onChange({ [minorClass]: parseFloat(floatVal.toFixed(6)), [other]: parseFloat((1 - floatVal).toFixed(6)) });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="capitalize">{minorClass.replace("_", " ")} rate</Label>
        <span className="text-sm font-mono font-medium">{minorVal.toFixed(2)}%</span>
      </div>
      <Slider
        min={0.1}
        max={20}
        step={0.1}
        value={[minorVal]}
        onValueChange={handleChange}
      />
      <div className="grid grid-cols-2 gap-2">
        {classes.map((cls) => (
          <div key={cls} className="flex justify-between text-xs text-muted-foreground rounded border px-3 py-2">
            <span className="capitalize">{cls.replace("_", " ")}</span>
            <span className="font-mono">{((current[cls] || 0) * 100).toFixed(2)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
