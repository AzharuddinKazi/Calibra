import { useState, useCallback, useRef } from "react";
import { parseColumnInstruction } from "@/utils/api";

const CONCURRENCY_LIMIT = 3;

/**
 * Manages column configuration grid state and per-row LLM processing.
 *
 * @returns {{ columns, initFromSpec, updateField, processColumn, processAll, isProcessingAll, getUpdatedSpecs }}
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
    setColumnsSync(
      specs.map((spec) => ({
        name: spec.name,
        col_type: spec.col_type,
        distribution_hint: spec.distribution_hint ?? null,
        distribution_params: spec.distribution_params ?? {},
        instruction: spec.agent_instruction ?? "",
        status: "idle",
        result: null,
        errorMessage: null,
      }))
    );
  }, []);

  /** Update a single field on the row identified by name. */
  const updateField = useCallback((name, field, value) => {
    setColumnsSync((prev) =>
      prev.map((col) => (col.name === name ? { ...col, [field]: value } : col))
    );
  }, []);

  /** Call the API for a single row and update state with the result. */
  async function _runProcessRow(name) {
    const row = columnsRef.current.find((c) => c.name === name);
    if (!row) return;

    // Mark as processing
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
    updateField,
    processColumn,
    processAll,
    isProcessingAll,
    getUpdatedSpecs,
  };
}
