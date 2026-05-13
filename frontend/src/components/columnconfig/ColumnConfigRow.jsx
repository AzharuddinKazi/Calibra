import { memo, useState, useRef, useEffect } from "react";
import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Loader2, CheckCircle2, AlertCircle, Trash2,
  ChevronUp, ChevronDown, RotateCcw, Copy, MoreHorizontal,
  Pencil, Check, X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const COL_TYPE_OPTIONS = [
  { value: "continuous", label: "Continuous" },
  { value: "categorical", label: "Categorical" },
  { value: "datetime", label: "Datetime" },
  { value: "boolean", label: "Boolean" },
  { value: "id", label: "ID" },
];

const DISTRIBUTION_OPTIONS = [
  { value: "auto", label: "Auto" },
  { value: "normal", label: "Normal" },
  { value: "lognormal", label: "Log-normal" },
  { value: "uniform", label: "Uniform" },
  { value: "exponential", label: "Exponential" },
  { value: "categorical", label: "Categorical" },
];

function formatParams(params) {
  if (!params || Object.keys(params).length === 0) return "—";
  const entries = Object.entries(params)
    .filter(([, v]) => v !== null && v !== undefined && !Array.isArray(v))
    .slice(0, 3)
    .map(([k, v]) => `${k}=${typeof v === "number" ? v.toFixed(2) : v}`);
  return entries.length > 0 ? entries.join(", ") : "—";
}

function StatusBadge({ status, errorMessage }) {
  if (status === "processing") {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
        <span>Processing…</span>
      </div>
    );
  }
  if (status === "done") {
    return (
      <div className="flex items-center gap-1.5 text-xs text-emerald-400">
        <CheckCircle2 className="h-3.5 w-3.5" />
        <span>Configured</span>
      </div>
    );
  }
  if (status === "error") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5 text-xs text-destructive cursor-help">
              <AlertCircle className="h-3.5 w-3.5" />
              <span>Error</span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <p className="text-xs">{errorMessage || "An error occurred."}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  return <span className="text-xs text-muted-foreground/60">Pending</span>;
}

function InlineNameEdit({ name, onRename }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const inputRef = useRef(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  function commit() {
    if (draft.trim() && draft.trim() !== name) {
      onRename(draft.trim());
    }
    setEditing(false);
  }

  function cancel() {
    setDraft(name);
    setEditing(false);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") commit();
    if (e.key === "Escape") cancel();
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <Input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={commit}
          className="h-7 text-xs font-mono w-32 border-primary/40 focus-visible:ring-primary/30"
        />
        <button onClick={commit} className="text-primary hover:text-primary/80 p-0.5">
          <Check className="h-3 w-3" />
        </button>
        <button onClick={cancel} className="text-muted-foreground hover:text-foreground p-0.5">
          <X className="h-3 w-3" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 group">
      <code className="font-mono text-xs font-medium text-foreground bg-muted/40 px-1.5 py-0.5 rounded">
        {name}
      </code>
      <button
        onClick={() => { setDraft(name); setEditing(true); }}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
      >
        <Pencil className="h-3 w-3" />
      </button>
    </div>
  );
}

const ColumnConfigRow = memo(function ColumnConfigRow({
  col,
  isFirst,
  isLast,
  onFieldChange,
  onProcess,
  onDelete,
  onRename,
  onMoveUp,
  onMoveDown,
  onReset,
  onDuplicate,
  isProcessingAll,
}) {
  const canProcess = col.instruction.trim().length > 0 && col.status !== "processing";
  const displayParams = col.result?.updated_params
    ? col.result.updated_params
    : col.distribution_params;
  const isLocked = col.status === "processing" || isProcessingAll;

  return (
    <>
      <TableRow className={cn(col.status === "done" && "bg-emerald-500/5")}>
        {/* Column name — click pencil to rename */}
        <TableCell className="w-48">
          <InlineNameEdit name={col.name} onRename={onRename} />
        </TableCell>

        {/* Data type */}
        <TableCell className="w-36">
          <Select
            value={col.col_type}
            onValueChange={(v) => onFieldChange("col_type", v)}
            disabled={isLocked}
          >
            <SelectTrigger className="h-8 text-xs border-border">
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

        {/* Distribution */}
        <TableCell className="w-36">
          <Select
            value={col.distribution_hint ?? "auto"}
            onValueChange={(v) => onFieldChange("distribution_hint", v === "auto" ? null : v)}
            disabled={isLocked}
          >
            <SelectTrigger className="h-8 text-xs border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DISTRIBUTION_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </TableCell>

        {/* Parameters (read-only display) */}
        <TableCell className="w-40">
          <code className="text-xs text-muted-foreground font-mono break-all">
            {formatParams(displayParams)}
          </code>
        </TableCell>

        {/* Instruction for agent */}
        <TableCell className="min-w-[200px]">
          <Textarea
            value={col.instruction}
            onChange={(e) => onFieldChange("instruction", e.target.value)}
            placeholder="e.g. lognormal, max $50,000, mostly small transactions"
            className="min-h-[56px] text-xs resize-none border-border focus-visible:ring-primary/30 bg-background"
            disabled={isLocked}
            rows={2}
          />
        </TableCell>

        {/* Status */}
        <TableCell className="w-28">
          <StatusBadge status={col.status} errorMessage={col.errorMessage} />
        </TableCell>

        {/* Actions */}
        <TableCell className="w-32">
          <div className="flex items-center gap-1">
            {/* Process button */}
            <Button
              size="sm"
              variant="outline"
              onClick={onProcess}
              disabled={!canProcess || isProcessingAll}
              className="text-xs h-7 px-2 border-border hover:border-primary/40 hover:text-primary"
            >
              {col.status === "processing" ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                "Process"
              )}
            </Button>

            {/* Overflow menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  disabled={isLocked}
                >
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onClick={onDuplicate} className="gap-2 text-xs">
                  <Copy className="h-3.5 w-3.5" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={onMoveUp}
                  disabled={isFirst}
                  className="gap-2 text-xs"
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                  Move Up
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={onMoveDown}
                  disabled={isLast}
                  className="gap-2 text-xs"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                  Move Down
                </DropdownMenuItem>
                {(col.status === "done" || col.status === "error") && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={onReset} className="gap-2 text-xs">
                      <RotateCcw className="h-3.5 w-3.5" />
                      Reset to Pending
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={onDelete}
                  className="gap-2 text-xs text-destructive focus:text-destructive focus:bg-destructive/10"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete Column
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </TableCell>
      </TableRow>

      {/* Readable summary row when LLM has processed */}
      {col.status === "done" && col.result?.readable_summary && (
        <TableRow className="bg-primary/5 border-l-2 border-primary/30">
          <TableCell colSpan={7} className="py-2 px-4">
            <p className="text-xs text-muted-foreground leading-relaxed">
              <span className="text-primary font-medium">✓ </span>
              {col.result.readable_summary}
            </p>
          </TableCell>
        </TableRow>
      )}
    </>
  );
});

export default ColumnConfigRow;
