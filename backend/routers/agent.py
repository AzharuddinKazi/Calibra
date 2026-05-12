"""/agent/session, /agent/message, /agent/state endpoints."""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, status

from backend.agent.agent import run_agent_turn
from backend.agent.state import AgentState
from backend.models.schemas import (
    AgentMessageRequest,
    AgentMessageResponse,
    AgentSessionRequest,
    AgentSessionResponse,
)
from backend.session.store import make_session_expiry

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/agent", tags=["agent"])

# In-memory agent session store (same pattern as main session store)
_agent_store: dict[str, AgentState] = {}


# ── POST /agent/session ───────────────────────────────────────────────────────

@router.post("/session", response_model=AgentSessionResponse)
async def create_agent_session(req: AgentSessionRequest) -> AgentSessionResponse:
    """Create a new agent session and return its ID and initial config."""
    session_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)

    state = AgentState(
        session_id=session_id,
        mode=req.mode,
        created_at=now,
        updated_at=now,
        entry_point=req.entry_point,
        upload_session_id=req.upload_session_id,
    )
    _agent_store[session_id] = state

    logger.info("Agent session created: %s (%s, %s)", session_id, req.mode, req.entry_point)

    return AgentSessionResponse(
        session_id=session_id,
        mode=req.mode,
        config=state.config,
        expires_at=make_session_expiry(),
    )


# ── POST /agent/message ────────────────────────────────────────────────────────

@router.post("/message", response_model=AgentMessageResponse)
async def send_message(req: AgentMessageRequest) -> AgentMessageResponse:
    """Process one user turn and return the agent reply and updated config."""
    state = _agent_store.get(req.session_id)
    if state is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent session not found.",
        )

    if not req.message.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Message must not be empty.",
        )

    turn_result = await run_agent_turn(state, req.message)

    return AgentMessageResponse(
        reply=turn_result.reply,
        updated_config=turn_result.updated_config,
        tool_calls_made=turn_result.tool_calls_made,
        ready_to_generate=state.config.ready_to_generate,
        preview_run_id=state.preview_run_id,
    )


# ── GET /agent/state/{session_id} ─────────────────────────────────────────────

@router.get("/state/{session_id}")
async def get_agent_state(session_id: str) -> dict:
    """Return current AgentState. Polled by ConfigSummaryPanel."""
    state = _agent_store.get(session_id)
    if state is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent session not found.",
        )
    return state.model_dump(mode="json")
