import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const RULE_TYPES = [
  { value: "bound", label: "Bound", description: "Value stays within a range" },
  { value: "conditional", label: "Conditional", description: "If A = X, then B satisfies Y" },
  { value: "relational", label: "Relational", description: "Column A compared to Column B" },
  { value: "temporal", label: "Temporal", description: "Max count within a time window" },
];

const OPERATORS = [">", "<", ">=", "<=", "="];
const TIME_UNITS = ["seconds", "minutes", "hours", "days"];

function ColumnSelect({ value, onChange, columns, placeholder = "Select column" }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-8 text-xs w-44">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {columns.map((col) => (
          <SelectItem key={col.name} value={col.name} className="text-xs">
            {col.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function BoundForm({ columns, fields, setFields }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Label className="text-xs text-muted-foreground w-20 shrink-0">Column</Label>
        <ColumnSelect value={fields.column ?? ""} onChange={(v) => setFields((p) => ({ ...p, column: v }))} columns={columns} />
      </div>
      <div className="flex items-center gap-3">
        <Label className="text-xs text-muted-foreground w-20 shrink-0">Min</Label>
        <Input
          type="number"
          step="any"
          className="h-8 text-xs w-36"
          placeholder="No minimum"
          value={fields.min ?? ""}
          onChange={(e) => setFields((p) => ({ ...p, min: e.target.value === "" ? undefined : parseFloat(e.target.value) }))}
        />
      </div>
      <div className="flex items-center gap-3">
        <Label className="text-xs text-muted-foreground w-20 shrink-0">Max</Label>
        <Input
          type="number"
          step="any"
          className="h-8 text-xs w-36"
          placeholder="No maximum"
          value={fields.max ?? ""}
          onChange={(e) => setFields((p) => ({ ...p, max: e.target.value === "" ? undefined : parseFloat(e.target.value) }))}
        />
      </div>
    </div>
  );
}

function ConditionalForm({ columns, fields, setFields }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <Label className="text-xs text-muted-foreground w-16 shrink-0">If column</Label>
        <ColumnSelect value={fields.if_column ?? ""} onChange={(v) => setFields((p) => ({ ...p, if_column: v }))} columns={columns} />
        <span className="text-xs text-muted-foreground">equals</span>
        <Input
          type="text"
          className="h-8 text-xs w-28"
          placeholder="value"
          value={fields.if_value ?? ""}
          onChange={(e) => setFields((p) => ({ ...p, if_value: e.target.value }))}
        />
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <Label className="text-xs text-muted-foreground w-16 shrink-0">Then column</Label>
        <ColumnSelect value={fields.then_column ?? ""} onChange={(v) => setFields((p) => ({ ...p, then_column: v }))} columns={columns} />
      </div>
      <div className="flex items-center gap-3">
        <Label className="text-xs text-muted-foreground w-16 shrink-0">Then min</Label>
        <Input
          type="number"
          step="any"
          className="h-8 text-xs w-36"
          placeholder="No minimum"
          value={fields.then_min ?? ""}
          onChange={(e) => setFields((p) => ({ ...p, then_min: e.target.value === "" ? undefined : parseFloat(e.target.value) }))}
        />
      </div>
      <div className="flex items-center gap-3">
        <Label className="text-xs text-muted-foreground w-16 shrink-0">Then max</Label>
        <Input
          type="number"
          step="any"
          className="h-8 text-xs w-36"
          placeholder="No maximum"
          value={fields.then_max ?? ""}
          onChange={(e) => setFields((p) => ({ ...p, then_max: e.target.value === "" ? undefined : parseFloat(e.target.value) }))}
        />
      </div>
    </div>
  );
}

function RelationalForm({ columns, fields, setFields }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Label className="text-xs text-muted-foreground w-16 shrink-0">Column A</Label>
      <ColumnSelect value={fields.col_a ?? ""} onChange={(v) => setFields((p) => ({ ...p, col_a: v }))} columns={columns} />
      <Select value={fields.operator ?? ""} onValueChange={(v) => setFields((p) => ({ ...p, operator: v }))}>
        <SelectTrigger className="h-8 text-xs w-20">
          <SelectValue placeholder="op" />
        </SelectTrigger>
        <SelectContent>
          {OPERATORS.map((op) => (
            <SelectItem key={op} value={op} className="text-xs">{op}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <ColumnSelect value={fields.col_b ?? ""} onChange={(v) => setFields((p) => ({ ...p, col_b: v }))} columns={columns} placeholder="Column B" />
    </div>
  );
}

function TemporalForm({ columns, fields, setFields }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Label className="text-xs text-muted-foreground w-20 shrink-0">Column</Label>
        <ColumnSelect value={fields.column ?? ""} onChange={(v) => setFields((p) => ({ ...p, column: v }))} columns={columns} />
      </div>
      <div className="flex items-center gap-3">
        <Label className="text-xs text-muted-foreground w-20 shrink-0">Group By</Label>
        <ColumnSelect value={fields.group_by ?? ""} onChange={(v) => setFields((p) => ({ ...p, group_by: v }))} columns={columns} placeholder="Optional" />
      </div>
      <div className="flex items-center gap-3">
        <Label className="text-xs text-muted-foreground w-20 shrink-0">Max count</Label>
        <Input
          type="number"
          min="1"
          step="1"
          className="h-8 text-xs w-28"
          placeholder="e.g. 10"
          value={fields.max_count ?? ""}
          onChange={(e) => setFields((p) => ({ ...p, max_count: e.target.value === "" ? undefined : parseInt(e.target.value, 10) }))}
        />
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        <Label className="text-xs text-muted-foreground w-20 shrink-0">Window</Label>
        <Input
          type="number"
          min="1"
          step="1"
          className="h-8 text-xs w-24"
          placeholder="e.g. 24"
          value={fields.window ?? ""}
          onChange={(e) => setFields((p) => ({ ...p, window: e.target.value === "" ? undefined : parseInt(e.target.value, 10) }))}
        />
        <Select value={fields.unit ?? "hours"} onValueChange={(v) => setFields((p) => ({ ...p, unit: v }))}>
          <SelectTrigger className="h-8 text-xs w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIME_UNITS.map((u) => (
              <SelectItem key={u} value={u} className="text-xs">{u}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function buildConstraint(ruleType, fields) {
  if (ruleType === "bound") {
    const params = {};
    if (fields.min !== undefined) params.min = fields.min;
    if (fields.max !== undefined) params.max = fields.max;
    const parts = [];
    if (fields.min !== undefined && fields.max !== undefined) {
      parts.push(`${fields.column} must be between ${fields.min} and ${fields.max}`);
    } else if (fields.min !== undefined) {
      parts.push(`${fields.column} must be ≥ ${fields.min}`);
    } else if (fields.max !== undefined) {
      parts.push(`${fields.column} must be ≤ ${fields.max}`);
    }
    return {
      rule_type: "bound",
      column: fields.column,
      params,
      readable_summary: parts[0] || "",
      source: "user_manual",
    };
  }

  if (ruleType === "conditional") {
    const params = {
      if_column: fields.if_column,
      if_value: fields.if_value,
      then_column: fields.then_column,
    };
    if (fields.then_min !== undefined) params.then_min = fields.then_min;
    if (fields.then_max !== undefined) params.then_max = fields.then_max;
    const summary = `If ${fields.if_column} = ${fields.if_value}, then ${fields.then_column} must be between ${fields.then_min ?? "—"} and ${fields.then_max ?? "—"}`;
    return {
      rule_type: "conditional",
      columns: [fields.if_column, fields.then_column],
      params,
      readable_summary: summary,
      source: "user_manual",
    };
  }

  if (ruleType === "relational") {
    return {
      rule_type: "relational",
      columns: [fields.col_a, fields.col_b],
      params: { operator: fields.operator },
      readable_summary: `${fields.col_a} must be ${fields.operator} ${fields.col_b}`,
      source: "user_manual",
    };
  }

  if (ruleType === "temporal") {
    const params = {
      max_count: fields.max_count,
      window: fields.window,
      unit: fields.unit ?? "hours",
    };
    if (fields.group_by) params.group_by = fields.group_by;
    return {
      rule_type: "temporal",
      column: fields.column,
      params,
      readable_summary: `Max ${fields.max_count} events per ${fields.window} ${fields.unit ?? "hours"}`,
      source: "user_manual",
    };
  }

  return null;
}

function isValid(ruleType, fields) {
  if (ruleType === "bound") {
    if (!fields.column) return false;
    if (fields.min !== undefined && fields.max !== undefined && fields.min > fields.max) return false;
    return true;
  }
  if (ruleType === "conditional") {
    return !!(fields.if_column && fields.if_value && fields.then_column);
  }
  if (ruleType === "relational") {
    return !!(fields.col_a && fields.operator && fields.col_b);
  }
  if (ruleType === "temporal") {
    return !!(fields.column && fields.max_count && fields.window);
  }
  return false;
}

function validationError(ruleType, fields) {
  if (ruleType === "bound" && fields.min !== undefined && fields.max !== undefined && fields.min > fields.max) {
    return "Min must be less than or equal to Max.";
  }
  return null;
}

export default function ConstraintBuilder({ columns, onAddConstraint }) {
  const [ruleType, setRuleType] = useState("bound");
  const [fields, setFields] = useState({});
  const [toast, setToast] = useState(false);

  useEffect(() => {
    setFields({});
  }, [ruleType]);

  function handleAdd() {
    const constraint = buildConstraint(ruleType, fields);
    if (!constraint) return;
    onAddConstraint(constraint);
    setFields({});
    setToast(true);
    setTimeout(() => setToast(false), 2000);
  }

  const error = validationError(ruleType, fields);
  const canAdd = isValid(ruleType, fields) && !error;

  const preview = isValid(ruleType, fields) ? buildConstraint(ruleType, fields)?.readable_summary : null;

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold text-foreground">Constraint Builder</p>
        <p className="text-xs text-muted-foreground mt-0.5">Define rules without natural language</p>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 space-y-5">
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Rule Type</Label>
          <div className="flex gap-1.5 flex-wrap">
            {RULE_TYPES.map((rt) => (
              <button
                key={rt.value}
                onClick={() => setRuleType(rt.value)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium transition-colors border",
                  ruleType === rt.value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:text-foreground hover:border-border/80"
                )}
                title={rt.description}
              >
                {rt.label}
              </button>
            ))}
          </div>
        </div>

        {ruleType === "bound" && <BoundForm columns={columns} fields={fields} setFields={setFields} />}
        {ruleType === "conditional" && <ConditionalForm columns={columns} fields={fields} setFields={setFields} />}
        {ruleType === "relational" && <RelationalForm columns={columns} fields={fields} setFields={setFields} />}
        {ruleType === "temporal" && <TemporalForm columns={columns} fields={fields} setFields={setFields} />}

        {error && (
          <p className="text-xs text-destructive">{error}</p>
        )}

        {preview && !error && (
          <p className="text-xs text-muted-foreground italic border-l-2 border-primary/40 pl-3">
            {preview}
          </p>
        )}

        <Button size="sm" className="h-8 text-xs" disabled={!canAdd} onClick={handleAdd}>
          Add Constraint
        </Button>
      </div>

      {toast && (
        <Alert className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 transition-opacity duration-500">
          <AlertDescription className="text-xs">Constraint added.</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
