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
    """Return contextual quick-reply options based on the agent's current question.

    Uses BOTH the reply text and the current config state to determine which
    question phase the agent is in, then returns options appropriate for that
    phase.  Config-state checks come first so options never repeat from a phase
    that has already been completed.
    """
    r = reply.lower()
    has_q = "?" in reply
    if not has_q:
        return []

    domain = config.get("domain_pack")
    typologies = config.get("typologies") or []
    prevalence = config.get("prevalence")
    row_count = config.get("row_count")
    columns = config.get("columns")

    # ── Phase 1: Domain — only when not yet set ───────────────────────────────
    if not domain and any(
        kw in r for kw in [
            "domain", "kind of data", "type of data", "use case",
            "what are you", "what would you", "what kind", "purpose",
            "building", "training", "generating", "create",
        ]
    ):
        return [
            "Fraud detection",
            "AML transaction monitoring",
            "General tabular data",
            "Not sure yet",
        ]

    # ── Phase 2: Fraud typologies — only when domain=fraud and typologies unset ─
    if domain == "fraud" and not typologies and any(
        kw in r for kw in [
            "typolog", "type of fraud", "specific type", "which type",
            "kind of fraud", "fraud type", "card", "takeover",
            "synthetic identity", "interested in", "focus on",
        ]
    ):
        return [
            "Card-not-present fraud",
            "Account takeover",
            "Synthetic identity",
            "First-party fraud",
            "All typologies",
        ]

    # ── Phase 2b: AML typologies — only when domain=aml and typologies unset ──
    if domain == "aml" and not typologies and any(
        kw in r for kw in [
            "typolog", "structuring", "layering", "fan-out", "fan-in",
            "circular", "scatter", "aml typolog", "pattern", "scheme",
            "money laundering", "which", "type",
        ]
    ):
        return [
            "Structuring / smurfing",
            "Fan-out",
            "Fan-in / aggregation",
            "Circular flow",
            "Scatter-gather",
        ]

    # ── Phase 3: Prevalence — only when not yet set ───────────────────────────
    if not prevalence and any(
        kw in r for kw in [
            "prevalence", "fraud rate", "% fraud", "percentage of fraud",
            "fraction of fraud", "what rate", "what percentage", "how much fraud",
            "target rate", "fraud proportion", "ratio", "aml rate", "suspicious",
        ]
    ):
        if domain == "aml":
            return [
                "0.5% suspicious (realistic)",
                "1% suspicious",
                "3% suspicious",
                "5% suspicious (elevated)",
            ]
        return [
            "1% fraud (realistic)",
            "2% fraud",
            "5% fraud",
            "10% fraud (elevated)",
        ]

    # ── Phase 4: Row count — only when not yet set ────────────────────────────
    if not row_count and any(
        kw in r for kw in [
            "how many rows", "row count", "many rows", "dataset size",
            "how large", "how big", "number of rows", "how many records",
            "size of", "many records", "volume",
        ]
    ):
        return ["10,000 rows", "50,000 rows", "100,000 rows", "500,000 rows"]

    # ── Phase 5: Column schema — only when columns not yet defined ────────────
    if not columns and any(
        kw in r for kw in [
            "column", "schema", "fields", "feature", "describe your",
            "tell me about your", "what columns", "which columns",
            "data structure", "attributes", "variables",
        ]
    ):
        return [
            "Standard transaction schema",
            "I'll describe the columns manually",
            "Similar to a bank ledger",
        ]

    # ── Phase 6: Constraints — open question about business rules ─────────────
    if any(
        kw in r for kw in [
            "constraint", "business rule", "any rule", "rule you",
            "restrict", "limitation", "requirement", "must", "should",
        ]
    ):
        return [
            "Transaction amount must be positive",
            "Add a specific rule",
            "No constraints needed",
        ]

    # ── Phase 7: Preview offer ────────────────────────────────────────────────
    if any(kw in r for kw in ["preview", "sample", "quick look", "want to see", "show you"]):
        return ["Yes, show me a preview", "Skip preview, generate full dataset"]

    # ── Phase 8: Final confirmation ───────────────────────────────────────────
    if any(
        kw in r for kw in [
            "ready to generate", "shall i", "want me to generate",
            "look good", "does this look", "happy with", "everything look",
            "confirm", "proceed",
        ]
    ):
        return ["Yes, generate now", "No, let me adjust something"]

    return []

# In-memory agent session store (same pattern as main session store)
_agent_store: dict[str, AgentState] = {}


def get_agent_session(session_id: str) -> AgentState | None:
    """Return the AgentState for session_id, or None if not found."""
    return _agent_store.get(session_id)


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
