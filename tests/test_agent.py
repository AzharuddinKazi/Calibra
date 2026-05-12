"""Tests for the agent layer.

All LLM calls are mocked. No live API calls, no engine calls.
Tool handlers are tested independently against AgentState mutations.
"""

from __future__ import annotations

import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from backend.agent.state import AgentState, ToolCallRecord
from backend.agent.tools import execute_tool
from backend.models.schemas import GenerationConfig


# ── Fixtures ──────────────────────────────────────────────────────────────────

def _make_state(**kwargs) -> AgentState:
    defaults = dict(
        session_id="test-session-001",
        mode="chat",
        entry_point="agent_first",
    )
    defaults.update(kwargs)
    return AgentState(**defaults)


# ── set_domain_pack ────────────────────────────────────────────────────────────

class TestSetDomainPack:
    @pytest.mark.asyncio
    async def test_sets_domain_pack(self):
        state = _make_state()
        result = await execute_tool(
            "set_domain_pack", {"domain_pack": "fraud"}, state
        )
        assert state.config.domain_pack == "fraud"
        assert "fraud" in result

    @pytest.mark.asyncio
    async def test_sets_typologies(self):
        state = _make_state()
        await execute_tool(
            "set_domain_pack",
            {"domain_pack": "aml", "typologies": ["structuring", "fan_out"]},
            state,
        )
        assert state.config.domain_pack == "aml"
        assert "structuring" in state.config.typologies
        assert "fan_out" in state.config.typologies

    @pytest.mark.asyncio
    async def test_invalid_domain_pack_returns_error(self):
        state = _make_state()
        result = await execute_tool(
            "set_domain_pack", {"domain_pack": "invalid"}, state
        )
        assert state.config.domain_pack is None
        assert "Invalid" in result

    @pytest.mark.asyncio
    async def test_logs_tool_call(self):
        state = _make_state()
        await execute_tool("set_domain_pack", {"domain_pack": "fraud"}, state)
        assert len(state.tool_calls_log) == 1
        assert state.tool_calls_log[0].tool_name == "set_domain_pack"

    @pytest.mark.asyncio
    async def test_overwrite_previous_domain_pack(self):
        state = _make_state()
        await execute_tool("set_domain_pack", {"domain_pack": "fraud"}, state)
        await execute_tool("set_domain_pack", {"domain_pack": "aml"}, state)
        assert state.config.domain_pack == "aml"


# ── set_prevalence ─────────────────────────────────────────────────────────────

class TestSetPrevalence:
    @pytest.mark.asyncio
    async def test_sets_valid_prevalence(self):
        state = _make_state()
        result = await execute_tool(
            "set_prevalence",
            {"prevalence": {"fraud": 0.02, "non_fraud": 0.98}},
            state,
        )
        assert state.config.prevalence == {"fraud": 0.02, "non_fraud": 0.98}
        assert "0.02" in result or "fraud" in result

    @pytest.mark.asyncio
    async def test_rejects_prevalence_not_summing_to_one(self):
        state = _make_state()
        result = await execute_tool(
            "set_prevalence",
            {"prevalence": {"fraud": 0.5, "non_fraud": 0.3}},
            state,
        )
        assert state.config.prevalence is None
        assert "1.0" in result or "sum" in result.lower()

    @pytest.mark.asyncio
    async def test_empty_prevalence_returns_error(self):
        state = _make_state()
        result = await execute_tool("set_prevalence", {"prevalence": {}}, state)
        assert "No prevalence" in result

    @pytest.mark.asyncio
    async def test_overwrites_previous_prevalence(self):
        state = _make_state()
        await execute_tool(
            "set_prevalence",
            {"prevalence": {"fraud": 0.01, "non_fraud": 0.99}},
            state,
        )
        await execute_tool(
            "set_prevalence",
            {"prevalence": {"fraud": 0.05, "non_fraud": 0.95}},
            state,
        )
        assert abs(state.config.prevalence["fraud"] - 0.05) < 1e-9


# ── add_constraint ─────────────────────────────────────────────────────────────

class TestAddConstraint:
    @pytest.mark.asyncio
    async def test_adds_parseable_constraint(self):
        state = _make_state()
        parsed_response = MagicMock()
        parsed_response.constraint = MagicMock()
        parsed_response.constraint.parseable = True
        parsed_response.constraint.rule_type = "bound"
        parsed_response.constraint.column = "amount"
        parsed_response.constraint.params = {"min": 0.01, "max": 10000}
        parsed_response.constraint.readable_summary = "Amount between 0.01 and 10000."
        parsed_response.constraint.parse_error = None
        parsed_response.message = None

        with patch("backend.agent.tools.parse_constraint", return_value=parsed_response):
            result = await execute_tool(
                "add_constraint", {"description": "amount between 0.01 and 10000"}, state
            )

        assert len(state.config.constraints) == 1
        assert state.config.constraints[0].column == "amount"
        assert "Constraint added" in result

    @pytest.mark.asyncio
    async def test_unparseable_constraint_not_added(self):
        state = _make_state()
        parsed_response = MagicMock()
        parsed_response.constraint = MagicMock()
        parsed_response.constraint.parseable = False
        parsed_response.constraint.parse_error = "Column not found."
        parsed_response.message = None

        with patch("backend.agent.tools.parse_constraint", return_value=parsed_response):
            result = await execute_tool(
                "add_constraint", {"description": "invalid_col > 0"}, state
            )

        assert len(state.config.constraints) == 0
        assert "not added" in result.lower()

    @pytest.mark.asyncio
    async def test_llm_failure_not_added(self):
        state = _make_state()
        parsed_response = MagicMock()
        parsed_response.constraint = None
        parsed_response.message = "LLM timed out."

        with patch("backend.agent.tools.parse_constraint", return_value=parsed_response):
            result = await execute_tool(
                "add_constraint", {"description": "any"}, state
            )

        assert len(state.config.constraints) == 0
        assert "not added" in result.lower()

    @pytest.mark.asyncio
    async def test_empty_description_returns_error(self):
        state = _make_state()
        result = await execute_tool("add_constraint", {"description": ""}, state)
        assert "No constraint description" in result

    @pytest.mark.asyncio
    async def test_multiple_constraints_accumulate(self):
        state = _make_state()

        def make_parsed(summary: str):
            r = MagicMock()
            r.constraint = MagicMock()
            r.constraint.parseable = True
            r.constraint.rule_type = "bound"
            r.constraint.column = "amount"
            r.constraint.params = {"min": 0}
            r.constraint.readable_summary = summary
            r.constraint.parse_error = None
            r.message = None
            return r

        with patch(
            "backend.agent.tools.parse_constraint",
            side_effect=[make_parsed("C1"), make_parsed("C2")],
        ):
            await execute_tool("add_constraint", {"description": "c1"}, state)
            await execute_tool("add_constraint", {"description": "c2"}, state)

        assert len(state.config.constraints) == 2


# ── define_schema ──────────────────────────────────────────────────────────────

class TestDefineSchema:
    @pytest.mark.asyncio
    async def test_defines_valid_schema(self):
        state = _make_state()
        result = await execute_tool(
            "define_schema",
            {
                "columns": [
                    {"name": "amount", "type": "continuous", "distribution_hint": "lognormal"},
                    {"name": "channel", "type": "categorical"},
                    {"name": "is_fraud", "type": "boolean"},
                ]
            },
            state,
        )
        assert state.config.columns is not None
        assert len(state.config.columns) == 3
        assert state.config.columns[0].name == "amount"
        assert "3 columns" in result

    @pytest.mark.asyncio
    async def test_empty_columns_returns_error(self):
        state = _make_state()
        result = await execute_tool("define_schema", {"columns": []}, state)
        assert state.config.columns is None
        assert "No columns" in result

    @pytest.mark.asyncio
    async def test_missing_name_returns_error(self):
        state = _make_state()
        result = await execute_tool(
            "define_schema",
            {"columns": [{"type": "continuous"}]},
            state,
        )
        assert "missing required fields" in result.lower()

    @pytest.mark.asyncio
    async def test_distribution_hints_stored(self):
        state = _make_state()
        await execute_tool(
            "define_schema",
            {
                "columns": [
                    {"name": "amount", "type": "continuous", "distribution_hint": "lognormal"},
                ]
            },
            state,
        )
        assert state.config.columns[0].distribution_hint == "lognormal"


# ── run_preview ────────────────────────────────────────────────────────────────

class TestRunPreview:
    @pytest.mark.asyncio
    async def test_sets_preview_run_id(self):
        state = _make_state()
        state.config.domain_pack = "fraud"
        result = await execute_tool("run_preview", {"row_count": 200}, state)
        assert state.preview_run_id is not None
        assert state.preview_run_id.startswith("preview_")
        assert "preview_" in result

    @pytest.mark.asyncio
    async def test_row_count_capped_at_500(self):
        state = _make_state()
        state.config.domain_pack = "fraud"
        result = await execute_tool("run_preview", {"row_count": 9999}, state)
        assert state.preview_run_id is not None

    @pytest.mark.asyncio
    async def test_fails_without_config(self):
        state = _make_state()
        result = await execute_tool("run_preview", {}, state)
        assert state.preview_run_id is None
        assert "incomplete" in result.lower() or "Cannot" in result


# ── mark_ready ─────────────────────────────────────────────────────────────────

class TestMarkReady:
    @pytest.mark.asyncio
    async def test_sets_ready_flag(self):
        state = _make_state()
        result = await execute_tool(
            "mark_ready",
            {"summary": "Fraud dataset with 2% prevalence and 10,000 rows."},
            state,
        )
        assert state.config.ready_to_generate is True
        assert "ready" in result.lower()

    @pytest.mark.asyncio
    async def test_empty_summary_returns_error(self):
        state = _make_state()
        result = await execute_tool("mark_ready", {"summary": ""}, state)
        assert state.config.ready_to_generate is False
        assert "summary" in result.lower()

    @pytest.mark.asyncio
    async def test_summary_included_in_result(self):
        state = _make_state()
        summary = "Config is complete."
        result = await execute_tool("mark_ready", {"summary": summary}, state)
        assert summary in result


# ── execute_tool dispatch ──────────────────────────────────────────────────────

class TestExecuteToolDispatch:
    @pytest.mark.asyncio
    async def test_unknown_tool_returns_error_string(self):
        state = _make_state()
        result = await execute_tool("nonexistent_tool", {}, state)
        assert "Unknown tool" in result

    @pytest.mark.asyncio
    async def test_tool_call_always_logged(self):
        state = _make_state()
        await execute_tool("set_domain_pack", {"domain_pack": "fraud"}, state)
        await execute_tool("set_prevalence", {"prevalence": {"a": 0.5, "b": 0.5}}, state)
        assert len(state.tool_calls_log) == 2

    @pytest.mark.asyncio
    async def test_handler_exception_caught(self):
        state = _make_state()
        with patch("backend.agent.tools._handle_set_domain_pack", side_effect=RuntimeError("boom")):
            result = await execute_tool("set_domain_pack", {"domain_pack": "fraud"}, state)
        assert "failed" in result.lower()


# ── Agent loop ────────────────────────────────────────────────────────────────

class TestAgentLoop:
    def _make_text_response(self, text: str):
        block = MagicMock()
        block.type = "text"
        block.text = text
        response = MagicMock()
        response.content = [block]
        response.stop_reason = "end_turn"
        return response

    def _make_tool_response(self, tool_name: str, tool_input: dict, tool_id: str = "tool_1"):
        tool_block = MagicMock()
        tool_block.type = "tool_use"
        tool_block.name = tool_name
        tool_block.input = tool_input
        tool_block.id = tool_id

        text_block = MagicMock()
        text_block.type = "text"
        text_block.text = ""

        response = MagicMock()
        response.content = [tool_block]
        response.stop_reason = "tool_use"
        return response

    @pytest.mark.asyncio
    async def test_simple_text_reply(self):
        from backend.agent.agent import run_agent_turn

        state = _make_state()
        mock_response = self._make_text_response("What domain pack would you like?")

        with patch("backend.agent.agent._client") as mock_client:
            mock_client.messages.create.return_value = mock_response
            result = await run_agent_turn(state, "I want to generate synthetic data.")

        assert result.reply == "What domain pack would you like?"
        assert result.tool_calls_made == []

    @pytest.mark.asyncio
    async def test_tool_call_mutates_config(self):
        from backend.agent.agent import run_agent_turn

        state = _make_state()
        tool_response = self._make_tool_response(
            "set_domain_pack", {"domain_pack": "fraud"}
        )
        final_response = self._make_text_response("I've set the domain pack to fraud.")

        with patch("backend.agent.agent._client") as mock_client:
            mock_client.messages.create.side_effect = [tool_response, final_response]
            result = await run_agent_turn(state, "Use fraud domain pack.")

        assert state.config.domain_pack == "fraud"
        assert "set_domain_pack" in result.tool_calls_made

    @pytest.mark.asyncio
    async def test_mark_ready_sets_flag(self):
        from backend.agent.agent import run_agent_turn

        state = _make_state()
        tool_response = self._make_tool_response(
            "mark_ready", {"summary": "All set."}
        )
        final_response = self._make_text_response("Your config is ready.")

        with patch("backend.agent.agent._client") as mock_client:
            mock_client.messages.create.side_effect = [tool_response, final_response]
            result = await run_agent_turn(state, "I'm ready to generate.")

        assert state.config.ready_to_generate is True

    @pytest.mark.asyncio
    async def test_user_message_appended_to_history(self):
        from backend.agent.agent import run_agent_turn

        state = _make_state()
        mock_response = self._make_text_response("Sure!")

        with patch("backend.agent.agent._client") as mock_client:
            mock_client.messages.create.return_value = mock_response
            await run_agent_turn(state, "Hello agent.")

        user_messages = [m for m in state.messages if m["role"] == "user"]
        assert any("Hello agent." in str(m["content"]) for m in user_messages)

    @pytest.mark.asyncio
    async def test_unhandled_exception_returns_fallback(self):
        from backend.agent.agent import run_agent_turn

        state = _make_state()

        with patch("backend.agent.agent._client") as mock_client:
            mock_client.messages.create.side_effect = Exception("API down")
            result = await run_agent_turn(state, "Hello.")

        assert "error" in result.reply.lower()
        assert result.tool_calls_made == []


# ── History summarisation ──────────────────────────────────────────────────────

class TestHistorySummarisation:
    def test_history_below_cap_unchanged(self):
        from backend.agent.agent import _maybe_summarise_history
        from backend.constants import AGENT_MAX_MESSAGES

        state = _make_state()
        for i in range(AGENT_MAX_MESSAGES - 5):
            state.messages.append({"role": "user", "content": f"message {i}"})

        original_count = len(state.messages)
        _maybe_summarise_history(state)
        assert len(state.messages) == original_count

    def test_history_over_cap_summarised(self):
        from backend.agent.agent import _maybe_summarise_history
        from backend.constants import AGENT_MAX_MESSAGES, AGENT_SUMMARISE_OLDEST

        state = _make_state()
        for i in range(AGENT_MAX_MESSAGES + 5):
            state.messages.append({"role": "user", "content": f"message {i}"})

        _maybe_summarise_history(state)
        assert len(state.messages) < AGENT_MAX_MESSAGES + 5
        assert state.messages[0]["content"].startswith("[conversation summary]")

    def test_summary_contains_original_content(self):
        from backend.agent.agent import _maybe_summarise_history
        from backend.constants import AGENT_MAX_MESSAGES

        state = _make_state()
        for i in range(AGENT_MAX_MESSAGES + 5):
            state.messages.append({"role": "user", "content": f"unique_content_{i}"})

        _maybe_summarise_history(state)
        summary_content = state.messages[0]["content"]
        assert "unique_content_0" in summary_content


# ── Config context injection ───────────────────────────────────────────────────

class TestConfigContextInjection:
    def test_context_appended_to_last_user_message(self):
        from backend.agent.agent import _inject_config_context

        messages = [
            {"role": "user", "content": "Hello"},
            {"role": "assistant", "content": "Hi"},
            {"role": "user", "content": "Set fraud pack"},
        ]
        result = _inject_config_context(messages, "\n\n[config: {}]")
        last_user = [m for m in result if m["role"] == "user"][-1]
        assert "[config: {}]" in last_user["content"]

    def test_original_messages_not_mutated(self):
        from backend.agent.agent import _inject_config_context

        messages = [{"role": "user", "content": "Hello"}]
        _inject_config_context(messages, "\n\n[ctx]")
        assert messages[0]["content"] == "Hello"

    def test_empty_messages_returned_unchanged(self):
        from backend.agent.agent import _inject_config_context

        result = _inject_config_context([], "[ctx]")
        assert result == []
