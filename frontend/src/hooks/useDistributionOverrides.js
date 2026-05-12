import { useState } from "react";

export function useDistributionOverrides() {
  const [overrides, setOverrides] = useState({});

  function setOverride(colName, override) {
    setOverrides((prev) => ({ ...prev, [colName]: override }));
  }

  function clearOverride(colName) {
    setOverrides((prev) => {
      const next = { ...prev };
      delete next[colName];
      return next;
    });
  }

  function clearAll() {
    setOverrides({});
  }

  return { overrides, setOverride, clearOverride, clearAll };
}
