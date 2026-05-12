import { useState, useCallback } from "react";
import { generate, replay } from "../utils/api";

export function useGeneration() {
  const [runId, setRunId] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | loading | complete | failed
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const startGeneration = useCallback(async (payload) => {
    setStatus("loading");
    setError(null);
    setResult(null);
    try {
      const data = await generate(payload);
      setRunId(data.run_id);
      setResult(data);
      setStatus("complete");
      return data;
    } catch (err) {
      setError(err.message);
      setStatus("failed");
      return null;
    }
  }, []);

  const replayRun = useCallback(async (id) => {
    setStatus("loading");
    setError(null);
    try {
      const data = await replay(id);
      setRunId(data.run_id);
      setResult(data);
      setStatus("complete");
      return data;
    } catch (err) {
      setError(err.message);
      setStatus("failed");
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    setRunId(null);
    setStatus("idle");
    setResult(null);
    setError(null);
  }, []);

  return { runId, status, result, error, startGeneration, replayRun, reset };
}
