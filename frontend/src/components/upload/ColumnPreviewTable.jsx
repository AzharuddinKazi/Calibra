import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const TYPE_COLORS = {
  continuous: "default",
  categorical: "secondary",
  boolean: "outline",
  datetime: "secondary",
  id: "outline",
};

export default function ColumnPreviewTable({ profiles }) {
  if (!profiles || profiles.length === 0) return null;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Column</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Null Rate</TableHead>
          <TableHead>Unique</TableHead>
          <TableHead>Mean / Top Values</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {profiles.map((p) => (
          <TableRow key={p.name}>
            <TableCell className="font-mono font-medium">{p.name}</TableCell>
            <TableCell>
              <Badge variant={TYPE_COLORS[p.col_type] || "outline"}>{p.col_type}</Badge>
            </TableCell>
            <TableCell className="text-muted-foreground">{(p.stats.null_rate * 100).toFixed(1)}%</TableCell>
            <TableCell className="text-muted-foreground">{p.stats.unique_count.toLocaleString()}</TableCell>
            <TableCell className="text-muted-foreground text-sm">
              {p.stats.mean != null
                ? `mean = ${p.stats.mean.toFixed(3)}`
                : (p.stats.top_values || []).slice(0, 3).join(", ") || "—"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
