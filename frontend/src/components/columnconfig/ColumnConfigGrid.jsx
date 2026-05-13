import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Loader2, Plus, LayoutTemplate, Check } from "lucide-react";
import { SCHEMA_TEMPLATES } from "@/hooks/useColumnConfig";
import ColumnConfigRow from "./ColumnConfigRow";

const COL_TYPE_OPTIONS = [
  { value: "continuous", label: "Continuous" },
  { value: "categorical", label: "Categorical" },
  { value: "datetime", label: "Datetime" },
  { value: "boolean", label: "Boolean" },
  { value: "id", label: "ID" },
];

function AddColumnRow({ onAdd }) {
  const [name, setName] = useState("");
  const [colType, setColType] = useState("continuous");
  const [error, setError] = useState("");

  function handleAdd() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Column name is required.");
      return;
    }
    onAdd(trimmed, colType);
    setName("");
    setColType("continuous");
    setError("");
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") handleAdd();
    else setError("");
  }

  return (
    <TableRow className="border-dashed border-border/60 bg-muted/20 hover:bg-muted/30">
      <TableCell className="w-48 py-2">
        <div className="space-y-1">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="new_column_name"
            className="h-8 text-xs font-mono border-dashed"
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      </TableCell>
      <TableCell className="w-36 py-2">
        <Select value={colType} onValueChange={setColType}>
          <SelectTrigger className="h-8 text-xs border-dashed">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {COL_TYPE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="text-xs">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell colSpan={4} className="py-2">
        <span className="text-xs text-muted-foreground/60 italic">
          Fill in details after adding the column
        </span>
      </TableCell>
      <TableCell className="py-2">
        <Button
          size="sm"
          onClick={handleAdd}
          className="h-7 text-xs gap-1.5 bg-primary/80 hover:bg-primary"
        >
          <Check className="h-3 w-3" />
          Add
        </Button>
      </TableCell>
    </TableRow>
  );
}

export default function ColumnConfigGrid({
  columns,
  onColumnChange,
  onProcess,
  onProcessAll,
  onAddColumn,
  onDeleteColumn,
  onRenameColumn,
  onMoveColumn,
  onResetColumn,
  onDuplicateColumn,
  onApplyTemplate,
  onContinue,
  onBack,
  isProcessingAll,
}) {
  const [showAddRow, setShowAddRow] = useState(false);
  const [templateConfirm, setTemplateConfirm] = useState(null);

  const hasAnyInstruction = columns.some((c) => c.instruction.trim().length > 0);
  const doneCount = columns.filter((c) => c.status === "done").length;

  function handleAddColumn(name, colType) {
    onAddColumn(name, colType);
    setShowAddRow(false);
  }

  function handleApplyTemplate(key) {
    if (columns.length > 0) {
      setTemplateConfirm(key);
    } else {
      onApplyTemplate(key);
    }
  }

  function confirmTemplate() {
    if (templateConfirm) {
      onApplyTemplate(templateConfirm);
      setTemplateConfirm(null);
    }
  }

  if (columns.length === 0 && !showAddRow) {
    return (
      <div className="flex flex-col h-full items-center justify-center gap-6 text-center py-20">
        <div className="space-y-2">
          <p className="text-muted-foreground text-sm">No columns defined yet.</p>
          <p className="text-xs text-muted-foreground/60">
            Start from a schema template or add columns manually.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 justify-center">
          {Object.entries(SCHEMA_TEMPLATES).map(([key, tpl]) => (
            <button
              key={key}
              onClick={() => onApplyTemplate(key)}
              className="px-4 py-3 rounded-lg border border-border bg-card hover:border-primary/50 hover:bg-primary/5 transition-colors text-left min-w-[180px]"
            >
              <p className="text-sm font-medium text-foreground">{tpl.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{tpl.description}</p>
            </button>
          ))}
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onBack} size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Chat
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowAddRow(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Column Manually
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Template confirm overlay */}
      {templateConfirm && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="rounded-xl border border-border bg-card p-6 max-w-sm w-full mx-4 space-y-4 shadow-xl">
            <div className="space-y-1">
              <p className="font-semibold text-sm">Replace all columns?</p>
              <p className="text-xs text-muted-foreground">
                Applying the <span className="text-foreground font-medium">{SCHEMA_TEMPLATES[templateConfirm]?.label}</span> template will
                replace your {columns.length} existing column{columns.length !== 1 ? "s" : ""} and clear all instructions.
              </p>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setTemplateConfirm(null)}>
                Cancel
              </Button>
              <Button size="sm" onClick={confirmTemplate}>
                Replace
              </Button>
            </div>
          </div>
        </div>
      )}

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

        <div className="flex items-center gap-2">
          {/* Schema templates dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="gap-2 border-border hover:border-primary/40 hover:text-primary">
                <LayoutTemplate className="h-3.5 w-3.5" />
                Templates
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
                Load a preset schema
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {Object.entries(SCHEMA_TEMPLATES).map(([key, tpl]) => (
                <DropdownMenuItem
                  key={key}
                  onClick={() => handleApplyTemplate(key)}
                  className="flex flex-col items-start gap-0.5 py-2"
                >
                  <span className="text-sm font-medium">{tpl.label}</span>
                  <span className="text-xs text-muted-foreground">{tpl.description}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Add column button */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowAddRow((v) => !v)}
            className="gap-2 border-border hover:border-primary/40 hover:text-primary"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Column
          </Button>

          {/* Process all */}
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
              <TableHead className="text-xs text-muted-foreground/70 font-medium w-32">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {columns.map((col, idx) => (
              <ColumnConfigRow
                key={col.name}
                col={col}
                isFirst={idx === 0}
                isLast={idx === columns.length - 1}
                onFieldChange={(field, value) => onColumnChange(col.name, field, value)}
                onProcess={() => onProcess(col.name)}
                onDelete={() => onDeleteColumn(col.name)}
                onRename={(newName) => onRenameColumn(col.name, newName)}
                onMoveUp={() => onMoveColumn(col.name, "up")}
                onMoveDown={() => onMoveColumn(col.name, "down")}
                onReset={() => onResetColumn(col.name)}
                onDuplicate={() => onDuplicateColumn(col.name)}
                isProcessingAll={isProcessingAll}
              />
            ))}
            {showAddRow && (
              <AddColumnRow onAdd={handleAddColumn} />
            )}
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
