import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Loader2 } from "lucide-react";
import ColumnConfigRow from "./ColumnConfigRow";

export default function ColumnConfigGrid({
  columns,
  onColumnChange,
  onProcess,
  onProcessAll,
  onContinue,
  onBack,
  isProcessingAll,
}) {
  const hasAnyInstruction = columns.some((c) => c.instruction.trim().length > 0);
  const doneCount = columns.filter((c) => c.status === "done").length;

  if (columns.length === 0) {
    return (
      <div className="flex flex-col h-full items-center justify-center gap-4 text-center py-20">
        <p className="text-muted-foreground text-sm">
          No columns defined. Return to the chat to describe your schema.
        </p>
        <Button variant="outline" onClick={onBack} size="sm">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Chat
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0 bg-card/50">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-semibold text-foreground">Column Configuration</h2>
          <Badge variant="secondary" className="text-xs">
            {columns.length} column{columns.length !== 1 ? "s" : ""}
          </Badge>
          {doneCount > 0 && (
            <Badge className="text-xs bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
              {doneCount} configured
            </Badge>
          )}
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={onProcessAll}
          disabled={!hasAnyInstruction || isProcessingAll}
          className="gap-2 border-border hover:border-primary/40 hover:text-primary"
        >
          {isProcessingAll && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Process All
        </Button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-xs text-muted-foreground/70 font-medium w-48">
                Column Name
              </TableHead>
              <TableHead className="text-xs text-muted-foreground/70 font-medium w-36">
                Data Type
              </TableHead>
              <TableHead className="text-xs text-muted-foreground/70 font-medium w-36">
                Distribution
              </TableHead>
              <TableHead className="text-xs text-muted-foreground/70 font-medium w-40">
                Parameters
              </TableHead>
              <TableHead className="text-xs text-muted-foreground/70 font-medium min-w-[200px]">
                Instruction for Agent
              </TableHead>
              <TableHead className="text-xs text-muted-foreground/70 font-medium w-28">
                Status
              </TableHead>
              <TableHead className="text-xs text-muted-foreground/70 font-medium w-24">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {columns.map((col) => (
              <ColumnConfigRow
                key={col.name}
                col={col}
                onFieldChange={(field, value) => onColumnChange(col.name, field, value)}
                onProcess={() => onProcess(col.name)}
                isProcessingAll={isProcessingAll}
              />
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Footer */}
      <div className="border-t border-border px-6 py-4 flex items-center justify-between shrink-0 bg-card/30">
        <Button
          variant="ghost"
          onClick={onBack}
          className="gap-2 text-muted-foreground hover:text-foreground"
          size="sm"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Chat
        </Button>
        <div className="flex items-center gap-3">
          <p className="text-xs text-muted-foreground">
            {doneCount} of {columns.length} columns configured — you can continue at any time.
          </p>
          <Button onClick={onContinue} size="sm" className="bg-primary hover:bg-primary/90">
            Continue to Generation →
          </Button>
        </div>
      </div>
    </div>
  );
}
