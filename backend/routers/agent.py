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
    UpdateColumnsRequest,
)
from backend.session.store import make_session_expiry

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/agent", tags=["agent"])


# ── Quick-reply suggestion extraction ─────────────────────────────────────────

def _extract_suggestions(reply: str, config: dict) -> list[str]:
    """Return contextual quick-reply chips based on what the agent just asked.

    Pattern-matches against the reply text and the current config state to
    surface the most relevant one-click answers for the current question.
    """
    r = reply.lower()
    has_q = "?" in reply

    # Domain pack — only when not yet set
    if not config.get("domain_pack") and has_q and any(
        kw in r for kw in ["domain", "kind of data", "type of data", "use case", "what are you"]
    ):
        return ["Fraud detection", "AML transaction monitoring", "General tabular data", "Not sure yet"]

    # Row count
    if has_q and any(kw in r for kw in ["how many rows", "row count", "many rows", "dataset size", "how large", "how big"]):
        return ["10,000 rows", "50,000 rows", "100,000 rows", "500,000 rows"]

    # Prevalence / fraud rate
    if has_q and any(kw in r for kw in ["prevalence", "fraud rate", "% fraud", "percentage of fraud", "fraction of fraud", "what rate", "what percentage"]):
        return ["1% fraud (realistic)", "2% fraud", "5% fraud", "10% fraud (elevated)"]

    # Fraud typologies
    if has_q and any(kw in r for kw in ["typolog", "type of fraud", "specific type", "which type", "card", "takeover", "synthetic identity"]):
        return ["Card-not-present fraud", "Account takeover", "Synthetic identity", "First-party fraud", "All typologies"]

    # AML typologies
    if has_q and any(kw in r for kw in ["structuring", "layering", "fan-out", "fan-in", "circular", "scatter", "aml typolog"]):
        return ["Structuring / smurfing", "Fan-out", "Fan-in / aggregation", "Circular flow", "Scatter-gather"]

    # Constraints
    if has_q and any(kw in r for kw in ["constraint", "business rule", "any rule", "rule you", "restrict"]):
        return ["Transaction amount > $0", "Add a rule", "No constraints needed"]

    # Column schema (agent-first, no CSV)
    if has_q and any(kw in r for kw in ["column", "schema", "fields", "feature", "describe your", "tell me about your"]):
        return ["Standard transaction schema", "I'll describe the columns manually", "Similar to a bank ledger"]

    # Confirmation before marking ready
    if has_q and any(kw in r for kw in ["ready to generate", "shall i", "want me to generate", "look good", "does this look", "happy with"]):
        return ["Yes, generate now", "No, let me adjust something"]

    # Preview offer
    if has_q and any(kw in r for kw in ["preview", "sample", "quick look", "want to see"]):
        return ["Yes, show me a preview", "Skip preview, generate full dataset"]

    return []

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
    suggestions = _extract_suggestions(turn_result.reply, state.config.model_dump())

    return AgentMessageResponse(
        reply=turn_result.reply,
        updated_config=turn_result.updated_config,
        tool_calls_made=turn_result.tool_calls_made,
        ready_to_generate=state.config.ready_to_generate,
        preview_run_id=state.preview_run_id,
        suggestions=suggestions,
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


# ── PATCH /agent/columns ───────────────────────────────────────────────────────

@router.patch("/columns")
async def update_agent_columns(req: UpdateColumnsRequest) -> dict:
    """Replace the column list in an agent session's config.

    Called after the column config grid is processed so the updated distribution
    hints and params are available to the generation engine.
    """
    state = _agent_store.get(req.session_id)
    if state is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent session not found.",
        )

    state.config.columns = req.columns
    state.updated_at = datetime.now(timezone.utc)
    logger.info(
        "Updated %d columns for agent session %s",
        len(req.columns),
        req.session_id,
    )
    return {"ok": True, "column_count": len(req.columns)}
