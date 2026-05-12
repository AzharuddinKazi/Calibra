"""LLM Call 1 — Column semantic annotation and domain pack suggestion.

Triggered automatically after /upload. Runs asynchronously.
Never sends raw data rows to the LLM — only column-level statistical summaries.
"""

from __future__ import annotations

import json
import logging

from backend.constants import PROMPT_VERSIONS
from backend.intelligence.client import call_llm, load_prompt
from backend.models.schemas import AnnotationResponse, ColumnAnnotation, ColumnProfile

logger = logging.getLogger(__name__)


def annotate_columns(profiles: list[ColumnProfile]) -> AnnotationResponse | None:
    """Call the LLM to annotate columns and suggest a domain pack.

    Returns an AnnotationResponse on success, or None on any failure.
    Callers must treat None as a signal to fall back to manual configuration.
    Raw data rows are never sent — only statistical summaries.
    """
    system_prompt = load_prompt(PROMPT_VERSIONS["annotate"])
    user_message = _build_user_message(profiles)

    raw = call_llm(system_prompt=system_prompt, user_message=user_message)
    if raw is None:
        logger.info("LLM annotation call returned None — falling back to manual config")
        return None

    return _parse_response(raw)


# ── Message assembly ───────────────────────────────────────────────────────────

def _build_user_message(profiles: list[ColumnProfile]) -> str:
    column_summaries = []
    for p in profiles:
        summary = {
            "name": p.name,
            "type": p.col_type,
            "stats": {
                "null_rate": p.stats.null_rate,
                "unique_count": p.stats.unique_count,
                "top_values": p.stats.top_values[:5],
            },
        }
        if p.stats.mean is not None:
            summary["stats"]["mean"] = round(p.stats.mean, 4)
            summary["stats"]["stddev"] = round(p.stats.stddev, 4) if p.stats.stddev else None
            summary["stats"]["min"] = round(p.stats.min, 4) if p.stats.min is not None else None
            summary["stats"]["max"] = round(p.stats.max, 4) if p.stats.max is not None else None
        column_summaries.append(summary)

    return (
        "Analyse the following column profiles and return the JSON annotation.\n\n"
        f"Columns:\n{json.dumps(column_summaries, indent=2)}"
    )


# ── Response parsing ───────────────────────────────────────────────────────────

def _parse_response(raw: str) -> AnnotationResponse | None:
    try:
        data = json.loads(raw.strip())
    except json.JSONDecodeError:
        logger.error("LLM annotation response is not valid JSON: %r", raw[:200])
        return None

    try:
        columns = [
            ColumnAnnotation(
                name=col["name"],
                semantic_label=col.get("semantic_label"),
                suggested_constraint=col.get("suggested_constraint"),
                reasoning=col.get("reasoning"),
            )
            for col in data.get("columns", [])
        ]
        return AnnotationResponse(
            columns=columns,
            recommended_domain_pack=data.get("recommended_domain_pack", "none"),
            recommended_typologies=data.get("recommended_typologies", []),
        )
    except Exception:
        logger.exception("Failed to parse LLM annotation response")
        return None
