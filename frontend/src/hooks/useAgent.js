import { useState, useCallback } from "react";
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

  const startSession = useCallback(async (sessionMode, entryPoint, uploadSessionId = null) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await createAgentSession(sessionMode, entryPoint, uploadSessionId);
      setSessionId(data.session_id);
      setMode(data.mode);
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
      const assistantMsg = {
        role: "assistant",
        content: data.reply,
        toolCallsMade: data.tool_calls_made,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setConfig(data.updated_config);
      setReadyToGenerate(data.ready_to_generate);
      setSuggestions(data.suggestions || []);
      if (data.preview_run_id) {
        setPreviewRunId(data.preview_run_id);
      }
      return data;
    } catch (err) {
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
  }, [sessionId]);

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
    startSession,
    sendMessage,
    switchMode,
    refreshState,
  };
}
