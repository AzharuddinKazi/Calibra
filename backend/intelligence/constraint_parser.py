"""LLM Call 2 — Natural language constraint → formal constraint schema.

Triggered when a user submits a free-text constraint. Synchronous.
No data rows or statistical summaries are sent — only column names and types.
"""

from __future__ import annotations

import json
import logging

from backend.constants import PROMPT_VERSIONS
from backend.intelligence.client import call_llm, load_prompt
from backend.models.schemas import ColumnProfile, ParseConstraintResponse, ParsedConstraint

logger = logging.getLogger(__name__)

_TIMEOUT_MESSAGE = "Request timed out. Please try again or use the manual constraint form."


def parse_constraint(
    natural_language: str,
    profiles: list[ColumnProfile],
) -> ParseConstraintResponse:
    """Convert a plain-English constraint to a formal schema object.

    Returns a ParseConstraintResponse. On LLM failure the constraint field
    is None and message contains a user-facing explanation — never raises.
    """
    system_prompt = load_prompt(PROMPT_VERSIONS["parse_constraint"])
    user_message = _build_user_message(natural_language, profiles)

    raw = call_llm(system_prompt=system_prompt, user_message=user_message)
    if raw is None:
        return ParseConstraintResponse(constraint=None, message=_TIMEOUT_MESSAGE)

    return _parse_response(raw)


# ── Message assembly ───────────────────────────────────────────────────────────

def _build_user_message(natural_language: str, profiles: list[ColumnProfile]) -> str:
    column_list = ", ".join(f"{p.name} ({p.col_type})" for p in profiles)
    return (
        f"Available columns: {column_list}\n\n"
        f'User constraint: "{natural_language}"\n\n'
        "Convert this to a constraint schema object."
    )


# ── Response parsing ───────────────────────────────────────────────────────────

def _parse_response(raw: str) -> ParseConstraintResponse:
    try:
        data = json.loads(raw.strip())
    except json.JSONDecodeError:
        logger.error("LLM constraint parse response is not valid JSON: %r", raw[:200])
        return ParseConstraintResponse(
            constraint=None,
            message="Could not parse the constraint. Please rephrase or use the manual form.",
        )

    try:
        parseable: bool = data.get("parseable", False)
        confidence: str = data.get("confidence", "low")

        if not parseable:
            parsed = ParsedConstraint(
                parseable=False,
                confidence="low",
                parse_error=data.get("parse_error", "Constraint could not be parsed."),
            )
            return ParseConstraintResponse(
                constraint=parsed,
                message=parsed.parse_error,
            )

        parsed = ParsedConstraint(
            parseable=True,
            confidence=confidence,
            rule_type=data.get("rule_type"),
            column=data.get("column"),
            params=data.get("params") or {},
            readable_summary=data.get("readable_summary"),
            parse_error=None,
        )
        return ParseConstraintResponse(
            constraint=parsed,
            readable_summary=parsed.readable_summary,
            confidence=confidence,
        )

    except Exception:
        logger.exception("Failed to build ParsedConstraint from LLM response")
        return ParseConstraintResponse(
            constraint=None,
            message="An unexpected error occurred while parsing the constraint.",
        )
