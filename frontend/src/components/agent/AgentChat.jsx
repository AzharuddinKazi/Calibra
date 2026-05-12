import { useState, useRef, useEffect } from "react";
import ConfirmGenerate from "./ConfirmGenerate";

export default function AgentChat({ messages, isLoading, readyToGenerate, config, onSend, onGenerate }) {
  const [input, setInput] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleSubmit(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");
    onSend(text);
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <p className="text-sm text-gray-400 text-center mt-8">
            Tell me what kind of synthetic data you'd like to generate.
          </p>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-prose rounded-xl px-4 py-2 text-sm
                ${msg.role === "user"
                  ? "bg-blue-600 text-white rounded-br-sm"
                  : "bg-gray-100 text-gray-800 rounded-bl-sm"}`}
            >
              {msg.content}
              {msg.toolCallsMade?.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {msg.toolCallsMade.map((t) => (
                    <span key={t} className="text-xs bg-blue-200 text-blue-800 rounded px-1.5 py-0.5">
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-xl px-4 py-2 text-sm text-gray-400 animate-pulse">
              Thinking…
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {readyToGenerate && (
        <div className="px-4 pb-2">
          <ConfirmGenerate config={config} onGenerate={onGenerate} />
        </div>
      )}

      <form onSubmit={handleSubmit} className="border-t border-gray-200 px-4 py-3 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message…"
          disabled={isLoading}
          className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Send
        </button>
      </form>
    </div>
  );
}
