import { useState, useCallback } from "react";
import { parseConstraint } from "../utils/api";

export function useConstraintParser() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [parsed, setParsed] = useState(null);
  const [error, setError] = useState(null);

  const parse = useCallback(async (sessionId, naturalLanguage) => {
    if (!naturalLanguage.trim()) return;
    setLoading(true);
    setError(null);
    setParsed(null);
    try {
      const data = await parseConstraint(sessionId, naturalLanguage);
      setParsed(data);
      return data;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const confirm = useCallback(() => {
    const result = parsed;
    setParsed(null);
    setInput("");
    return result;
  }, [parsed]);

  const discard = useCallback(() => {
    setParsed(null);
    setInput("");
  }, []);

  return { input, setInput, loading, parsed, error, parse, confirm, discard };
}
