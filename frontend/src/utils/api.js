/**
 * All API calls to the Calibra backend are centralised here.
 * No fetch() calls should appear anywhere else in the frontend.
 */

// In development, relative "/api" is proxied by Vite to http://localhost:8000
// (see vite.config.js proxy section). This avoids cross-origin failures when
// the browser is on a different machine than the backend.
// Override at build time via VITE_API_URL for production deployments.
const BASE_URL = import.meta.env.VITE_API_URL ?? "/api";

async function request(path, options = {}) {
  const token = localStorage.getItem("calibra_token");
  const headers = {
    ...(options.body && !(options.body instanceof FormData)
      ? { "Content-Type": "application/json" }
      : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      detail = body.detail || detail;
    } catch (_) {}
    throw new Error(detail);
  }

  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return res.json();
  }
  return res.blob();
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export function register(email, password) {
  return request("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function login(email, password) {
  return request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function getMe() {
  return request("/auth/me");
}

// ── Generation ────────────────────────────────────────────────────────────────

export function generate(payload) {
  return request("/generate", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function replay(runId) {
  return request("/replay", {
    method: "POST",
    body: JSON.stringify({ run_id: runId }),
  });
}

// ── Preview ───────────────────────────────────────────────────────────────────

export function getPreview(runId) {
  return request(`/preview/${runId}`);
}

// ── Agent ─────────────────────────────────────────────────────────────────────

export function createAgentSession(mode, entryPoint, uploadSessionId = null) {
  return request("/agent/session", {
    method: "POST",
    body: JSON.stringify({
      mode,
      entry_point: entryPoint,
      upload_session_id: uploadSessionId,
    }),
  });
}

export function sendAgentMessage(sessionId, message) {
  return request("/agent/message", {
    method: "POST",
    body: JSON.stringify({ session_id: sessionId, message }),
  });
}

export function getAgentState(sessionId) {
  return request(`/agent/state/${sessionId}`);
}

export function patchAgentColumns(sessionId, columns) {
  return request("/agent/columns", {
    method: "PATCH",
    body: JSON.stringify({ session_id: sessionId, columns }),
  });
}

// ── Intelligence — column instruction ────────────────────────────────────────

export function parseColumnInstruction(payload) {
  return request("/intelligence/parse-column-instruction", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
