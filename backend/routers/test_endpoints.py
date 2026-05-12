"""/test/* endpoints for LLM and agent testing.

Two endpoints:
  POST /test/llm   — raw Claude call with system prompt + messages
  POST /test/agent — stateless agent turn (no session required)

Intended for writing automated test cases and debugging agent behaviour
before wiring up the full UI flow.
"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from backend.agent.agent import AgentTurnResult, run_agent_turn
from backend.agent.state import AgentState
from backend.constants import LLM_MAX_TOKENS, LLM_MODEL
from backend.intelligence.client import call_llm
from backend.models.schemas import GenerationConfig

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/test", tags=["testing"])


# ── Schemas ────────────────────────────────────────────────────────────────────

class LLMTestRequest(BaseModel):
    system: str = Field(description="System prompt sent to Claude.")
    messages: list[dict[str, Any]] = Field(
        description='Conversation turns: [{"role": "user"|"assistant", "content": "..."}]'
    )
    max_tokens: int = Field(default=LLM_MAX_TOKENS, gt=0, le=4096)
    timeout: float = Field(default=10.0, gt=0, le=60.0)


class LLMTestResponse(BaseModel):
    response: str | None
    model: str
    timed_out: bool


class AgentTestRequest(BaseModel):
    messages: list[dict[str, Any]] = Field(
        description=(
            "Full conversation including the user message to process as the final entry. "
            'Last message must have role "user".'
        )
    )
    config: dict[str, Any] = Field(
        default_factory=dict,
        description="Optional starting GenerationConfig state (partial dict is fine).",
    )
    mode: str = Field(default="chat", description='"chat" or "wizard".')


class AgentTestResponse(BaseModel):
    reply: str
    tool_calls_made: list[str]
    updated_config: dict[str, Any]
    ready_to_generate: bool


# ── POST /test/llm ─────────────────────────────────────────────────────────────

@router.post("/llm", response_model=LLMTestResponse)
async def test_llm(req: LLMTestRequest) -> LLMTestResponse:
    """Send a raw message to Claude and return the response.

    Useful for testing prompt changes and verifying LLM output format
    without going through the full intelligence pipeline.

    The last message in ``messages`` with role ``user`` is used as the
    user message. Assistant turns before it are ignored — ``call_llm``
    is single-turn only. For multi-turn testing use ``POST /test/agent``.
    """
    user_messages = [m for m in req.messages if m.get("role") == "user"]
    if not user_messages:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="messages must contain at least one entry with role 'user'.",
        )

    user_text = user_messages[-1].get("content", "")
    result = call_llm(
        system_prompt=req.system,
        user_message=user_text,
        max_tokens=req.max_tokens,
        timeout=req.timeout,
    )

    return LLMTestResponse(
        response=result,
        model=LLM_MODEL,
        timed_out=result is None,
    )


# ── POST /test/agent ───────────────────────────────────────────────────────────

@router.post("/agent", response_model=AgentTestResponse)
async def test_agent(req: AgentTestRequest) -> AgentTestResponse:
    """Run a single stateless agent turn and return the reply and config delta.

    No session is created or persisted — a throwaway ``AgentState`` is built
    from the supplied ``messages`` and ``config``, ``run_agent_turn`` is called
    once, and the result is returned.

    The last entry in ``messages`` must have ``role: "user"`` — it becomes the
    user message for the turn. All preceding messages are loaded into the state
    as prior conversation history.

    Example request::

        {
          "messages": [
            {"role": "user", "content": "I need fraud detection data, 2% prevalence"}
          ]
        }

    Multi-turn example::

        {
          "messages": [
            {"role": "user",      "content": "fraud detection data"},
            {"role": "assistant", "content": "Sure! What prevalence rate?"},
            {"role": "user",      "content": "2% fraud, 50k rows"}
          ],
          "config": {"domain_pack": "fraud"}
        }
    """
    if not req.messages:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="messages must not be empty.",
        )

    last = req.messages[-1]
    if last.get("role") != "user":
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Last message must have role 'user'.",
        )

    user_message: str = last.get("content", "")
    history = req.messages[:-1]

    try:
        config = GenerationConfig(**req.config) if req.config else GenerationConfig()
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid config: {exc}",
        ) from exc

    now = datetime.now(timezone.utc)
    state = AgentState(
        session_id=str(uuid.uuid4()),
        mode=req.mode,  # type: ignore[arg-type]
        created_at=now,
        updated_at=now,
        messages=list(history),
        config=config,
    )

    result: AgentTurnResult = await run_agent_turn(state, user_message)

    return AgentTestResponse(
        reply=result.reply,
        tool_calls_made=result.tool_calls_made,
        updated_config=state.config.model_dump(),
        ready_to_generate=state.config.ready_to_generate,
    )
