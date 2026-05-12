"""Core agent loop — stateful, tool-calling, session-aware.

Implements one conversation turn via run_agent_turn(). Config context is
injected into the last user message only. Message history is capped at
AGENT_MAX_MESSAGES; when exceeded the oldest AGENT_SUMMARISE_OLDEST messages
are collapsed into a single summary entry before the next API call.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import anthropic

from backend.agent.state import AgentState
from backend.agent.tools import TOOL_DEFINITIONS, execute_tool
from backend.constants import (
    AGENT_MAX_MESSAGES,
    AGENT_MAX_TOOL_ITERATIONS,
    AGENT_SUMMARISE_OLDEST,
    LLM_MAX_TOKENS,
    LLM_MODEL,
    LLM_TIMEOUT_SECONDS,
)
from backend.models.schemas import GenerationConfig

logger = logging.getLogger(__name__)

_client = anthropic.Anthropic()

_PROMPT_DIR = Path(__file__).parent / "prompts"


# ── Public entry point ─────────────────────────────────────────────────────────

class AgentTurnResult:
    def __init__(
        self,
        reply: str,
        updated_config: GenerationConfig,
        tool_calls_made: list[str],
    ) -> None:
        self.reply = reply
        self.updated_config = updated_config
        self.tool_calls_made = tool_calls_made


async def run_agent_turn(state: AgentState, user_message: str) -> AgentTurnResult:
    """Process one user turn and return the agent reply and updated config.

    Mutates state in-place (messages, config, updated_at).
    Never raises — on any unhandled error returns a fallback reply.
    """
    try:
        return await _run_turn(state, user_message)
    except Exception as exc:
        logger.exception("Unhandled error in agent turn: %s", exc)
        fallback = "I encountered an unexpected error. Please try again."
        state.messages.append({"role": "assistant", "content": fallback})
        state.updated_at = datetime.now(timezone.utc)
        return AgentTurnResult(
            reply=fallback,
            updated_config=state.config,
            tool_calls_made=[],
        )


# ── Internal turn logic ────────────────────────────────────────────────────────

async def _run_turn(state: AgentState, user_message: str) -> AgentTurnResult:
    state.messages.append({"role": "user", "content": user_message})
    _maybe_summarise_history(state)

    system_prompt = _load_system_prompt()
    config_context = f"\n\n[Current config: {state.config.model_dump_json()}]"

    tool_calls_made: list[str] = []

    for iteration in range(AGENT_MAX_TOOL_ITERATIONS):
        messages_with_context = _inject_config_context(state.messages, config_context)

        response = _client.messages.create(
            model=LLM_MODEL,
            max_tokens=LLM_MAX_TOKENS,
            system=system_prompt,
            tools=TOOL_DEFINITIONS,
            messages=messages_with_context,
            timeout=LLM_TIMEOUT_SECONDS,
        )

        tool_use_blocks = [b for b in response.content if b.type == "tool_use"]

        if not tool_use_blocks:
            # No more tool calls — extract text and finish
            assistant_text = _extract_text(response.content)
            state.messages.append({"role": "assistant", "content": assistant_text})
            state.updated_at = datetime.now(timezone.utc)
            return AgentTurnResult(
                reply=assistant_text,
                updated_config=state.config,
                tool_calls_made=tool_calls_made,
            )

        # Execute all tool calls in this response
        tool_results: list[dict[str, Any]] = []
        for block in tool_use_blocks:
            tool_calls_made.append(block.name)
            result_text = await execute_tool(block.name, block.input, state)
            tool_results.append(
                {
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": result_text,
                }
            )

        # Append assistant message with tool use blocks, then tool results
        state.messages.append({"role": "assistant", "content": response.content})
        state.messages.append({"role": "user", "content": tool_results})

        if response.stop_reason == "end_turn":
            break

    # After the loop, make one final call to get the conversational reply
    messages_with_context = _inject_config_context(state.messages, config_context)
    final_response = _client.messages.create(
        model=LLM_MODEL,
        max_tokens=LLM_MAX_TOKENS,
        system=system_prompt,
        tools=TOOL_DEFINITIONS,
        messages=messages_with_context,
        timeout=LLM_TIMEOUT_SECONDS,
    )

    assistant_text = _extract_text(final_response.content)
    state.messages.append({"role": "assistant", "content": assistant_text})
    state.updated_at = datetime.now(timezone.utc)

    return AgentTurnResult(
        reply=assistant_text,
        updated_config=state.config,
        tool_calls_made=tool_calls_made,
    )


# ── History management ─────────────────────────────────────────────────────────

def _maybe_summarise_history(state: AgentState) -> None:
    """Collapse the oldest AGENT_SUMMARISE_OLDEST messages when history exceeds cap."""
    if len(state.messages) <= AGENT_MAX_MESSAGES:
        return

    oldest = state.messages[:AGENT_SUMMARISE_OLDEST]
    rest = state.messages[AGENT_SUMMARISE_OLDEST:]

    text_parts: list[str] = []
    for msg in oldest:
        role = msg.get("role", "unknown")
        content = msg.get("content", "")
        if isinstance(content, str):
            text_parts.append(f"{role}: {content[:200]}")
        elif isinstance(content, list):
            for block in content:
                if isinstance(block, dict) and block.get("type") == "text":
                    text_parts.append(f"{role}: {block.get('text', '')[:200]}")

    summary_text = "[conversation summary] " + " | ".join(text_parts)
    summary_message = {"role": "user", "content": summary_text}

    state.messages = [summary_message] + rest
    logger.info(
        "Summarised %d messages into single summary entry (session %s)",
        AGENT_SUMMARISE_OLDEST,
        state.session_id,
    )


# ── Context injection ──────────────────────────────────────────────────────────

def _inject_config_context(
    messages: list[dict[str, Any]], context: str
) -> list[dict[str, Any]]:
    """Return a copy of messages with config context appended to the last user message."""
    if not messages:
        return messages

    result = list(messages)
    for i in range(len(result) - 1, -1, -1):
        if result[i].get("role") == "user":
            original = result[i]["content"]
            if isinstance(original, str):
                result[i] = {**result[i], "content": original + context}
            return result

    return result


# ── Text extraction ────────────────────────────────────────────────────────────

def _extract_text(content: list[Any]) -> str:
    parts: list[str] = []
    for block in content:
        if hasattr(block, "type") and block.type == "text":
            parts.append(block.text)
        elif isinstance(block, dict) and block.get("type") == "text":
            parts.append(block.get("text", ""))
    return " ".join(parts).strip()


# ── Prompt loading ─────────────────────────────────────────────────────────────

def _load_system_prompt() -> str:
    path = _PROMPT_DIR / "agent_system_v1.txt"
    if not path.exists():
        raise FileNotFoundError(f"Agent system prompt not found: {path}")
    return path.read_text(encoding="utf-8")
