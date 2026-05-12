import { useState, useCallback } from "react";
import { annotateColumns } from "../utils/api";

export function useAnnotation() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [isFallback, setIsFallback] = useState(false);
  const [error, setError] = useState(null);

  const annotate = useCallback(async (sessionId) => {
    setLoading(true);
    setError(null);
    setIsFallback(false);
    try {
      const data = await annotateColumns(sessionId);
      if (!data || data.annotations === null) {
        setIsFallback(true);
        setResult(null);
      } else {
        setResult(data);
      }
    } catch (err) {
      setError(err.message);
      setIsFallback(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setIsFallback(false);
    setError(null);
  }, []);

  return { loading, result, isFallback, error, annotate, reset };
}
