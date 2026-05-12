import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

export default function ConstraintList({ constraints, onDelete }) {
  if (!constraints?.length) {
    return <p className="text-sm text-muted-foreground italic">No constraints added yet.</p>;
  }

  return (
    <ul className="space-y-2">
      {constraints.map((c, i) => (
        <li key={i} className="flex items-start justify-between gap-3 rounded-lg border px-4 py-3">
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">{c.rule_type}</Badge>
              <Badge variant="outline" className="text-xs">{c.source}</Badge>
            </div>
            <p className="text-sm">{c.readable_summary || `${c.column || c.columns?.join(", ") || "—"}`}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
            onClick={() => onDelete(i)}
          >
            <X className="h-4 w-4" />
          </Button>
        </li>
      ))}
    </ul>
  );
}
