import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function ConstraintInput({ sessionId, onParse, loading }) {
  const [value, setValue] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    const text = value.trim();
    if (text) { onParse(sessionId, text); setValue(""); }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder='e.g. "amount must be between 0.01 and 50,000"'
        disabled={loading}
      />
      <Button type="submit" disabled={loading || !value.trim()}>
        {loading ? "Parsing…" : "Parse"}
      </Button>
    </form>
  );
}
