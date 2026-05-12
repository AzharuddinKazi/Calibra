"""Tests for POST /test/llm and POST /test/agent.

All LLM and Anthropic API calls are mocked — no live API calls are made.
"""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from backend.main import app

client = TestClient(app)


# ── /test/llm ─────────────────────────────────────────────────────────────────

class TestLLMEndpoint:
    def test_returns_llm_response(self):
        with patch("backend.routers.test_endpoints.call_llm", return_value='{"ok": true}'):
            resp = client.post("/test/llm", json={
                "system": "Return JSON only.",
                "messages": [{"role": "user", "content": "hello"}],
            })
        assert resp.status_code == 200
        data = resp.json()
        assert data["response"] == '{"ok": true}'
        assert data["timed_out"] is False

    def test_timed_out_flag_when_llm_returns_none(self):
        with patch("backend.routers.test_endpoints.call_llm", return_value=None):
            resp = client.post("/test/llm", json={
                "system": "test",
                "messages": [{"role": "user", "content": "hello"}],
            })
        assert resp.status_code == 200
        data = resp.json()
        assert data["timed_out"] is True
        assert data["response"] is None

    def test_uses_last_user_message(self):
        captured = {}

        def fake_call_llm(system_prompt, user_message, **kwargs):
            captured["user_message"] = user_message
            return "ok"

        with patch("backend.routers.test_endpoints.call_llm", side_effect=fake_call_llm):
            client.post("/test/llm", json={
                "system": "test",
                "messages": [
                    {"role": "user", "content": "first message"},
                    {"role": "assistant", "content": "reply"},
                    {"role": "user", "content": "last message"},
                ],
            })
        assert captured["user_message"] == "last message"

    def test_rejects_messages_with_no_user_role(self):
        resp = client.post("/test/llm", json={
            "system": "test",
            "messages": [{"role": "assistant", "content": "hi"}],
        })
        assert resp.status_code == 422

    def test_rejects_empty_messages(self):
        resp = client.post("/test/llm", json={
            "system": "test",
            "messages": [],
        })
        assert resp.status_code == 422

    def test_model_field_in_response(self):
        with patch("backend.routers.test_endpoints.call_llm", return_value="hi"):
            resp = client.post("/test/llm", json={
                "system": "test",
                "messages": [{"role": "user", "content": "hi"}],
            })
        assert "model" in resp.json()
        assert resp.json()["model"]  # non-empty string

    def test_custom_max_tokens_forwarded(self):
        captured = {}

        def fake_call_llm(system_prompt, user_message, max_tokens=1024, **kwargs):
            captured["max_tokens"] = max_tokens
            return "ok"

        with patch("backend.routers.test_endpoints.call_llm", side_effect=fake_call_llm):
            client.post("/test/llm", json={
                "system": "test",
                "messages": [{"role": "user", "content": "hi"}],
                "max_tokens": 256,
            })
        assert captured["max_tokens"] == 256


# ── /test/agent ───────────────────────────────────────────────────────────────

def _make_mock_turn_result(reply="Got it!", tool_calls=None):
    from backend.agent.agent import AgentTurnResult
    from backend.models.schemas import GenerationConfig

    mock = MagicMock(spec=AgentTurnResult)
    mock.reply = reply
    mock.tool_calls_made = tool_calls or []
    mock.updated_config = GenerationConfig()
    return mock


class TestAgentEndpoint:
    def test_returns_agent_reply(self):
        mock_result = _make_mock_turn_result(reply="What prevalence?")

        with patch(
            "backend.routers.test_endpoints.run_agent_turn",
            new_callable=AsyncMock,
            return_value=mock_result,
        ):
            resp = client.post("/test/agent", json={
                "messages": [{"role": "user", "content": "I need fraud data"}],
            })

        assert resp.status_code == 200
        assert resp.json()["reply"] == "What prevalence?"

    def test_tool_calls_returned(self):
        mock_result = _make_mock_turn_result(
            reply="Domain pack set.", tool_calls=["set_domain_pack"]
        )

        with patch(
            "backend.routers.test_endpoints.run_agent_turn",
            new_callable=AsyncMock,
            return_value=mock_result,
        ):
            resp = client.post("/test/agent", json={
                "messages": [{"role": "user", "content": "fraud detection"}],
            })

        assert "set_domain_pack" in resp.json()["tool_calls_made"]

    def test_updated_config_returned(self):
        from backend.agent.agent import AgentTurnResult
        from backend.models.schemas import GenerationConfig

        async def fake_run(state, user_message):
            state.config.domain_pack = "fraud"
            result = MagicMock(spec=AgentTurnResult)
            result.reply = "Set fraud pack."
            result.tool_calls_made = ["set_domain_pack"]
            result.updated_config = state.config
            return result

        with patch("backend.routers.test_endpoints.run_agent_turn", side_effect=fake_run):
            resp = client.post("/test/agent", json={
                "messages": [{"role": "user", "content": "fraud please"}],
            })

        assert resp.json()["updated_config"]["domain_pack"] == "fraud"

    def test_multi_turn_history_loaded(self):
        received_history = {}

        async def fake_run(state, user_message):
            received_history["count"] = len(state.messages)
            received_history["user_message"] = user_message
            result = MagicMock()
            result.reply = "ok"
            result.tool_calls_made = []
            result.updated_config = state.config
            return result

        with patch("backend.routers.test_endpoints.run_agent_turn", side_effect=fake_run):
            client.post("/test/agent", json={
                "messages": [
                    {"role": "user", "content": "first"},
                    {"role": "assistant", "content": "reply"},
                    {"role": "user", "content": "second"},
                ],
            })

        assert received_history["count"] == 2  # two messages loaded into history
        assert received_history["user_message"] == "second"

    def test_rejects_last_message_not_user(self):
        resp = client.post("/test/agent", json={
            "messages": [
                {"role": "user", "content": "hi"},
                {"role": "assistant", "content": "hello"},
            ],
        })
        assert resp.status_code == 422

    def test_rejects_empty_messages(self):
        resp = client.post("/test/agent", json={"messages": []})
        assert resp.status_code == 422

    def test_initial_config_applied(self):
        received_config = {}

        async def fake_run(state, user_message):
            received_config["domain_pack"] = state.config.domain_pack
            result = MagicMock()
            result.reply = "ok"
            result.tool_calls_made = []
            result.updated_config = state.config
            return result

        with patch("backend.routers.test_endpoints.run_agent_turn", side_effect=fake_run):
            client.post("/test/agent", json={
                "messages": [{"role": "user", "content": "hi"}],
                "config": {"domain_pack": "aml"},
            })

        assert received_config["domain_pack"] == "aml"

    def test_invalid_config_returns_422(self):
        resp = client.post("/test/agent", json={
            "messages": [{"role": "user", "content": "hi"}],
            "config": {"domain_pack": "not_a_valid_pack"},
        })
        assert resp.status_code == 422

    def test_ready_to_generate_flag(self):
        async def fake_run(state, user_message):
            state.config.ready_to_generate = True
            result = MagicMock()
            result.reply = "Ready!"
            result.tool_calls_made = ["mark_ready"]
            result.updated_config = state.config
            return result

        with patch("backend.routers.test_endpoints.run_agent_turn", side_effect=fake_run):
            resp = client.post("/test/agent", json={
                "messages": [{"role": "user", "content": "generate"}],
            })

        assert resp.json()["ready_to_generate"] is True
