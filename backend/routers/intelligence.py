"""/intelligence/annotate and /intelligence/parse-constraint endpoints."""

from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, status

from backend.intelligence.annotator import annotate_columns
from backend.intelligence.constraint_parser import parse_constraint
from backend.models.schemas import (
    AnnotateRequest,
    AnnotationResponse,
    ParseConstraintRequest,
    ParseConstraintResponse,
)
from backend.session.store import get_session

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/intelligence", tags=["intelligence"])


# ── POST /intelligence/annotate ────────────────────────────────────────────────

@router.post("/annotate")
async def annotate(req: AnnotateRequest):
    """Annotate columns using LLM Call 1. Returns null on LLM failure."""
    session = await get_session(req.session_id)
    if session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found or expired.",
        )

    if not session.column_profile:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Session has no column profile — upload a CSV first.",
        )

    result = annotate_columns(session.column_profile)

    if result is None:
        logger.info("Annotation LLM returned None for session %s", req.session_id)
        return {"annotations": None}

    return result


# ── POST /intelligence/parse-constraint ───────────────────────────────────────

@router.post("/parse-constraint", response_model=ParseConstraintResponse)
async def parse_constraint_endpoint(
    req: ParseConstraintRequest,
) -> ParseConstraintResponse:
    """Parse a natural-language constraint using LLM Call 2."""
    session = await get_session(req.session_id)
    if session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found or expired.",
        )

    if not req.natural_language.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="natural_language must not be empty.",
        )

    result = parse_constraint(req.natural_language, session.column_profile)
    return result
