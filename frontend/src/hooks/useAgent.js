import { useState, useCallback, useRef } from "react";
import { createAgentSession, sendAgentMessage, getAgentState } from "../utils/api";

export function useAgent() {
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [config, setConfig] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState("chat");
  const [error, setError] = useState(null);
  const [readyToGenerate, setReadyToGenerate] = useState(false);
  const [previewRunId, setPreviewRunId] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  // Increments each turn a new suggestion set arrives — used as QuestionModal key
  // so the modal always remounts with fresh state even when option strings are identical
  const [suggestionKey, setSuggestionKey] = useState(0);

  // Keep a ref to the current mode so auto-recovery can re-create the session
  // with the same mode without needing mode in sendMessage's dependency array.
  const modeRef = useRef("chat");

  const startSession = useCallback(async (sessionMode, entryPoint, uploadSessionId = null) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await createAgentSession(sessionMode, entryPoint, uploadSessionId);
      setSessionId(data.session_id);
      setMode(data.mode);
      modeRef.current = data.mode;
      setConfig(data.config);
      setMessages([]);
      setSuggestions([]);
      return data;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Shared helper that applies a successful agent response to state.
  const _applyTurnResult = useCallback((data) => {
    const assistantMsg = {
      role: "assistant",
      content: data.reply,
      toolCallsMade: data.tool_calls_made,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, assistantMsg]);
    setConfig(data.updated_config);
    setReadyToGenerate(data.ready_to_generate);
    const newSuggestions = data.suggestions || [];
    setSuggestions(newSuggestions);
    if (newSuggestions.length > 0) {
      setSuggestionKey((k) => k + 1);
    }
    if (data.preview_run_id) {
      setPreviewRunId(data.preview_run_id);
    }
  }, []);

  const sendMessage = useCallback(async (text) => {
    if (!text.trim()) return;

    // Always show the user's message immediately — never silently drop it.
    const userMsg = { role: "user", content: text, timestamp: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    setSuggestions([]); // clear chips as soon as user sends anything

    if (!sessionId) {
      const errMsg = {
        role: "assistant",
        content: "Session not connected. Please refresh the page and try again.",
        timestamp: Date.now(),
        isError: true,
      };
      setMessages((prev) => [...prev, errMsg]);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const data = await sendAgentMessage(sessionId, text);
      _applyTurnResult(data);
      return data;
    } catch (err) {
      // Auto-recover from a stale session (backend restart wipes in-memory store).
      // Silently create a fresh session and retry the message so the user never
      // sees a hard error just because the server restarted.
      if (err.message === "Agent session not found.") {
        try {
          const newSession = await createAgentSession(modeRef.current, "agent_first");
          setSessionId(newSession.session_id);
          setConfig(newSession.config);
          const retryData = await sendAgentMessage(newSession.session_id, text);
          _applyTurnResult(retryData);
          return retryData;
        } catch (retryErr) {
          const errMsg = {
            role: "assistant",
            content: "Could not reconnect to the backend. Please refresh the page.",
            timestamp: Date.now(),
            isError: true,
          };
          setMessages((prev) => [...prev, errMsg]);
          return null;
        }
      }
      setError(err.message);
      const errMsg = {
        role: "assistant",
        content: `Something went wrong: ${err.message}. Please try again.`,
        timestamp: Date.now(),
        isError: true,
      };
      setMessages((prev) => [...prev, errMsg]);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, _applyTurnResult]);

  const switchMode = useCallback(async (newMode) => {
    setMode(newMode);
  }, []);

  const refreshState = useCallback(async () => {
    if (!sessionId) return;
    try {
      const state = await getAgentState(sessionId);
      setConfig(state.config);
      setReadyToGenerate(state.config?.ready_to_generate || false);
    } catch (_) {}
  }, [sessionId]);

  return {
    sessionId,
    messages,
    config,
    isLoading,
    mode,
    error,
    readyToGenerate,
    previewRunId,
    suggestions,
    suggestionKey,
    startSession,
    sendMessage,
    switchMode,
    refreshState,
  };
}
