import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function SampleTable({ rows }) {
  if (!rows?.length) return <p className="text-sm text-muted-foreground">No sample data available.</p>;

  const columns = Object.keys(rows[0]);
  const labelCols = columns.filter((c) => /^(is_fraud|fraud|sar|label)$/i.test(c));
  const isNum = (col) => rows.some((r) => typeof r[col] === "number");

  function renderCell(col, val) {
    if (labelCols.includes(col)) {
      const positive = val === 1 || val === true || val === "1";
      return <Badge variant={positive ? "destructive" : "success"}>{String(val)}</Badge>;
    }
    return String(val);
  }

  return (
    <ScrollArea className="h-[400px] rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((c) => (
              <TableHead key={c} className={isNum(c) ? "text-right" : ""}>{c}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, i) => (
            <TableRow key={i}>
              {columns.map((col) => (
                <TableCell key={col} className={`${isNum(col) ? "text-right font-mono text-xs" : ""}`}>
                  {renderCell(col, row[col])}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );
}
