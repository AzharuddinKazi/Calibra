import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default function ColumnAnnotations({ annotations, onAccept, onReject }) {
  const [edits, setEdits] = useState({});

  if (!annotations?.length) return null;

  function handleEdit(name, value) {
    setEdits((prev) => ({ ...prev, [name]: value }));
  }

  function handleAccept(col) {
    onAccept({ ...col, semantic_label: edits[col.name] ?? col.semantic_label });
  }

  return (
    <div className="space-y-3">
      {annotations.map((col) => (
        <Card key={col.name}>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start gap-4">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-medium">{col.name}</span>
                  {col.suggested_constraint && (
                    <Badge variant="secondary" className="text-xs">{col.suggested_constraint.rule_type}</Badge>
                  )}
                </div>
                <Input
                  defaultValue={col.semantic_label || ""}
                  placeholder="Semantic label (optional)"
                  className="h-8 text-sm"
                  onChange={(e) => handleEdit(col.name, e.target.value)}
                />
                {col.reasoning && (
                  <p className="text-xs text-muted-foreground italic">{col.reasoning}</p>
                )}
              </div>
              <div className="flex gap-2 mt-1 shrink-0">
                <Button size="sm" onClick={() => handleAccept(col)}>Accept</Button>
                <Button size="sm" variant="ghost" onClick={() => onReject(col.name)}>Reject</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
