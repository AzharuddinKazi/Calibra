"""LLM Call 3 — Plain-English executive summary for the audit report.

Triggered after generation completes, before PDF assembly. Synchronous.
No generated data rows are sent — only run metadata and statistics.
"""

from __future__ import annotations

import json
import logging
from datetime import datetime

from backend.constants import PROMPT_VERSIONS
from backend.intelligence.client import call_llm, load_prompt
from backend.models.schemas import FidelityScores

logger = logging.getLogger(__name__)

_UNAVAILABLE_NOTE = "Executive summary unavailable — summary generation timed out or failed."


def summarise_run(
    run_id: str,
    timestamp: datetime,
    row_count_requested: int,
    row_count_delivered: int,
    domain_pack: str | None,
    fidelity: FidelityScores,
    constraint_count: int,
    constraint_failures: int,
    prevalence_targets: dict[str, float],
    prevalence_actuals: dict[str, float],
    prompt_version: str | None = None,
) -> str:
    """Generate a plain-English executive summary for the audit report PDF.

    Returns the summary text on success, or a fallback note on failure.
    Never raises.
    """
    system_prompt = load_prompt(PROMPT_VERSIONS["summarise"])
    user_message = _build_user_message(
        run_id=run_id,
        timestamp=timestamp,
        row_count_requested=row_count_requested,
        row_count_delivered=row_count_delivered,
        domain_pack=domain_pack,
        fidelity=fidelity,
        constraint_count=constraint_count,
        constraint_failures=constraint_failures,
        prevalence_targets=prevalence_targets,
        prevalence_actuals=prevalence_actuals,
        prompt_version=prompt_version,
    )

    result = call_llm(system_prompt=system_prompt, user_message=user_message, max_tokens=512)
    if result is None:
        logger.info("LLM summarise call returned None — using fallback note")
        return _UNAVAILABLE_NOTE

    return result.strip()


# ── Message assembly ───────────────────────────────────────────────────────────

def _build_user_message(
    run_id: str,
    timestamp: datetime,
    row_count_requested: int,
    row_count_delivered: int,
    domain_pack: str | None,
    fidelity: FidelityScores,
    constraint_count: int,
    constraint_failures: int,
    prevalence_targets: dict[str, float],
    prevalence_actuals: dict[str, float],
    prompt_version: str | None,
) -> str:
    summary = {
        "run_id": run_id,
        "timestamp": timestamp.isoformat(),
        "row_count_requested": row_count_requested,
        "row_count_delivered": row_count_delivered,
        "domain_pack": domain_pack or "none",
        "fidelity": {
            "composite": fidelity.composite,
            "column_fidelity": fidelity.column_fidelity,
            "correlation_fidelity": fidelity.correlation_fidelity,
            "below_threshold": fidelity.composite < 0.75,
        },
        "constraints_applied": constraint_count,
        "constraint_failures": constraint_failures,
        "prevalence_targets": prevalence_targets,
        "prevalence_actuals": prevalence_actuals,
        "prompt_version": prompt_version or PROMPT_VERSIONS["summarise"],
    }
    return f"Generation run summary:\n{json.dumps(summary, indent=2)}\n\nWrite the executive summary."
