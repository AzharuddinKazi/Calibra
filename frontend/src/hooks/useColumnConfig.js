import { useState, useCallback, useRef } from "react";
import { parseColumnInstruction } from "@/utils/api";

const CONCURRENCY_LIMIT = 3;

// ── Schema templates ──────────────────────────────────────────────────────────

export const SCHEMA_TEMPLATES = {
  fraud_transaction: {
    label: "Fraud Transaction",
    description: "Standard payment transaction schema for fraud detection",
    columns: [
      { name: "transaction_id", col_type: "id" },
      { name: "amount", col_type: "continuous", distribution_hint: "lognormal" },
      { name: "merchant_category", col_type: "categorical" },
      { name: "card_type", col_type: "categorical" },
      { name: "channel", col_type: "categorical" },
      { name: "hour_of_day", col_type: "continuous", distribution_hint: "uniform" },
      { name: "country_code", col_type: "categorical" },
      { name: "is_fraud", col_type: "boolean" },
    ],
  },
  aml_transfer: {
    label: "AML Wire Transfer",
    description: "Transaction schema for AML monitoring",
    columns: [
      { name: "transaction_id", col_type: "id" },
      { name: "sender_account", col_type: "id" },
      { name: "receiver_account", col_type: "id" },
      { name: "amount", col_type: "continuous", distribution_hint: "lognormal" },
      { name: "transaction_type", col_type: "categorical" },
      { name: "timestamp", col_type: "datetime" },
      { name: "currency", col_type: "categorical" },
      { name: "is_suspicious", col_type: "boolean" },
    ],
  },
  ecommerce_order: {
    label: "E-commerce Order",
    description: "Online retail order dataset",
    columns: [
      { name: "order_id", col_type: "id" },
      { name: "customer_id", col_type: "id" },
      { name: "product_category", col_type: "categorical" },
      { name: "price", col_type: "continuous", distribution_hint: "lognormal" },
      { name: "quantity", col_type: "continuous", distribution_hint: "exponential" },
      { name: "payment_method", col_type: "categorical" },
      { name: "order_timestamp", col_type: "datetime" },
      { name: "is_returned", col_type: "boolean" },
    ],
  },
  bank_ledger: {
    label: "Bank Ledger",
    description: "Core banking ledger entry schema",
    columns: [
      { name: "entry_id", col_type: "id" },
      { name: "account_id", col_type: "id" },
      { name: "debit_amount", col_type: "continuous", distribution_hint: "lognormal" },
      { name: "credit_amount", col_type: "continuous", distribution_hint: "lognormal" },
      { name: "balance", col_type: "continuous", distribution_hint: "normal" },
      { name: "entry_type", col_type: "categorical" },
      { name: "posting_date", col_type: "datetime" },
    ],
  },
};

// ── Row factory ────────────────────────────────────────────────────────────────

function makeRow(spec) {
  return {
    name: spec.name,
    col_type: spec.col_type ?? "continuous",
    distribution_hint: spec.distribution_hint ?? null,
    distribution_params: spec.distribution_params ?? {},
    instruction: spec.agent_instruction ?? "",
    status: "idle",
    result: null,
    errorMessage: null,
  };
}

/**
 * Manages column configuration grid state and per-row LLM processing.
 */
export function useColumnConfig() {
  const [columns, setColumns] = useState([]);
  const [isProcessingAll, setIsProcessingAll] = useState(false);

  // Keep a ref so async callbacks can read the latest rows without stale closure
  const columnsRef = useRef([]);
  function setColumnsSync(updater) {
    setColumns((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      columnsRef.current = next;
      return next;
    });
  }

  /** Initialise the grid from a ColumnSpec array. */
  const initFromSpec = useCallback((specs) => {
    setColumnsSync(specs.map(makeRow));
  }, []);

  /** Apply a named schema template, replacing all current columns. */
  const applyTemplate = useCallback((templateKey) => {
    const tpl = SCHEMA_TEMPLATES[templateKey];
    if (!tpl) return;
    setColumnsSync(tpl.columns.map(makeRow));
  }, []);

  /** Update a single field on the row identified by name. */
  const updateField = useCallback((name, field, value) => {
    setColumnsSync((prev) =>
      prev.map((col) => (col.name === name ? { ...col, [field]: value } : col))
    );
  }, []);

  /** Add a new blank column. No-op if a column with that name already exists. */
  const addColumn = useCallback((name, col_type = "continuous") => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setColumnsSync((prev) => {
      if (prev.some((c) => c.name === trimmed)) return prev;
      return [
        ...prev,
        makeRow({ name: trimmed, col_type }),
      ];
    });
  }, []);

  /** Remove a column by name. */
  const deleteColumn = useCallback((name) => {
    setColumnsSync((prev) => prev.filter((c) => c.name !== name));
  }, []);

  /** Rename a column. No-op if newName is already taken. */
  const renameColumn = useCallback((oldName, newName) => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setColumnsSync((prev) => {
      if (prev.some((c) => c.name === trimmed && c.name !== oldName)) return prev;
      return prev.map((c) => (c.name === oldName ? { ...c, name: trimmed } : c));
    });
  }, []);

  /** Move a column up or down by one position. */
  const moveColumn = useCallback((name, direction) => {
    setColumnsSync((prev) => {
      const idx = prev.findIndex((c) => c.name === name);
      if (idx < 0) return prev;
      const newIdx = direction === "up" ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
      return next;
    });
  }, []);

  /** Reset a processed/errored row back to idle so it can be re-processed. */
  const resetColumn = useCallback((name) => {
    setColumnsSync((prev) =>
      prev.map((c) =>
        c.name === name ? { ...c, status: "idle", result: null, errorMessage: null } : c
      )
    );
  }, []);

  /** Duplicate a column with a new auto-generated name. */
  const duplicateColumn = useCallback((name) => {
    setColumnsSync((prev) => {
      const source = prev.find((c) => c.name === name);
      if (!source) return prev;
      let newName = `${source.name}_copy`;
      let suffix = 2;
      while (prev.some((c) => c.name === newName)) {
        newName = `${source.name}_copy${suffix++}`;
      }
      const clone = { ...source, name: newName, status: "idle", result: null, errorMessage: null };
      const idx = prev.findIndex((c) => c.name === name);
      const next = [...prev];
      next.splice(idx + 1, 0, clone);
      return next;
    });
  }, []);

  /** Call the API for a single row and update state with the result. */
  async function _runProcessRow(name) {
    const row = columnsRef.current.find((c) => c.name === name);
    if (!row) return;

    setColumnsSync((prev) =>
      prev.map((c) =>
        c.name === name ? { ...c, status: "processing", errorMessage: null } : c
      )
    );

    try {
      const data = await parseColumnInstruction({
        column_name: row.name,
        col_type: row.col_type,
        instruction_text: row.instruction,
        existing_params: row.distribution_params,
      });

      if (!data.success) {
        throw new Error(data.error_message || "The instruction could not be parsed.");
      }

      setColumnsSync((prev) =>
        prev.map((c) =>
          c.name === name
            ? {
                ...c,
                status: "done",
                distribution_hint: data.updated_distribution_hint ?? c.distribution_hint,
                distribution_params:
                  Object.keys(data.updated_params || {}).length > 0
                    ? data.updated_params
                    : c.distribution_params,
                result: data,
                errorMessage: null,
              }
            : c
        )
      );
    } catch (err) {
      setColumnsSync((prev) =>
        prev.map((c) =>
          c.name === name
            ? {
                ...c,
                status: "error",
                errorMessage: err?.message || "An error occurred. Please try again.",
              }
            : c
        )
      );
    }
  }

  /** Process a single column's instruction via the LLM endpoint. */
  const processColumn = useCallback((name) => {
    _runProcessRow(name);
  }, []);

  /** Process all rows with non-empty instructions, up to CONCURRENCY_LIMIT at a time. */
  const processAll = useCallback(async () => {
    const targetNames = columnsRef.current
      .filter((c) => c.instruction.trim().length > 0 && c.status !== "done")
      .map((c) => c.name);

    if (targetNames.length === 0) return;

    setIsProcessingAll(true);

    for (let i = 0; i < targetNames.length; i += CONCURRENCY_LIMIT) {
      const batch = targetNames.slice(i, i + CONCURRENCY_LIMIT);
      await Promise.allSettled(batch.map((name) => _runProcessRow(name)));
    }

    setIsProcessingAll(false);
  }, []);

  /**
   * Return a ColumnSpec[] with current distribution hints, params, and instructions.
   * Used to sync back to the server via PATCH /agent/columns.
   */
  const getUpdatedSpecs = useCallback(() => {
    return columnsRef.current.map((col) => ({
      name: col.name,
      col_type: col.col_type,
      distribution_hint: col.distribution_hint ?? null,
      distribution_params: col.distribution_params ?? {},
      sample_values: [],
      agent_instruction: col.instruction || null,
    }));
  }, []);

  return {
    columns,
    initFromSpec,
    applyTemplate,
    updateField,
    addColumn,
    deleteColumn,
    renameColumn,
    moveColumn,
    resetColumn,
    duplicateColumn,
    processColumn,
    processAll,
    isProcessingAll,
    getUpdatedSpecs,
  };
}
