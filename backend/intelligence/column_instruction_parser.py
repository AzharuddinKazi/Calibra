"""Column instruction parser — LLM call for per-column distribution configuration.

Interprets a free-text instruction for a single dataset column and returns
structured distribution parameters and format constraints. Stateless — no
session or profiler data required.
"""

from __future__ import annotations

import json
import logging
from typing import Any

from backend.constants import PROMPT_VERSIONS
from backend.intelligence.client import call_llm, load_prompt
from backend.models.schemas import ColumnInstructionResponse

logger = logging.getLogger(__name__)

_FALLBACK_ERROR = "Could not parse the instruction. Please try rephrasing or be more specific."


def parse_column_instruction(
    column_name: str,
    col_type: str,
    instruction_text: str,
    existing_params: dict[str, Any] | None = None,
) -> ColumnInstructionResponse:
    """Interpret a free-text column instruction into structured distribution config.

    Calls the LLM with the column context and instruction. Returns a
    ColumnInstructionResponse regardless of outcome — never raises.

    Args:
        column_name: The name of the column being configured.
        col_type: The column type (continuous, categorical, datetime, boolean, id).
        instruction_text: Plain-English instruction from the user.
        existing_params: Current distribution params to preserve where not overridden.

    Returns:
        ColumnInstructionResponse with success=True on a parseable instruction,
        success=False with error_message on any failure.
    """
    params = existing_params or {}

    try:
        system_prompt = load_prompt(PROMPT_VERSIONS["parse_column_instruction"])
    except FileNotFoundError:
        logger.error("parse_column_instruction prompt file not found")
        return ColumnInstructionResponse(
            success=False,
            error_message="Configuration error: prompt file not found.",
        )

    user_message = _build_user_message(column_name, col_type, instruction_text, params)

    try:
        raw = call_llm(system_prompt=system_prompt, user_message=user_message)
    except Exception:
        logger.exception("Unexpected error calling LLM for column instruction")
        return ColumnInstructionResponse(success=False, error_message=_FALLBACK_ERROR)

    if raw is None:
        logger.warning("LLM returned None for column instruction: %s", column_name)
        return ColumnInstructionResponse(success=False, error_message=_FALLBACK_ERROR)

    return _parse_llm_response(raw)


def _build_user_message(
    column_name: str,
    col_type: str,
    instruction_text: str,
    existing_params: dict[str, Any],
) -> str:
    """Assemble the user message for the LLM call."""
    params_repr = json.dumps(existing_params) if existing_params else "{}"
    return (
        f"Column name: {column_name}\n"
        f"Column type: {col_type}\n"
        f"Existing params: {params_repr}\n\n"
        f"Instruction: {instruction_text}\n\n"
        "Return the structured configuration JSON."
    )


def _parse_llm_response(raw: str) -> ColumnInstructionResponse:
    """Parse the raw LLM JSON response into a ColumnInstructionResponse."""
    try:
        data: dict[str, Any] = json.loads(raw.strip())
    except json.JSONDecodeError:
        logger.error("LLM column instruction response is not valid JSON: %r", raw[:300])
        return ColumnInstructionResponse(
            success=False,
            error_message="Received an invalid response. Please try again.",
        )

    try:
        success: bool = bool(data.get("success", False))

        if not success:
            return ColumnInstructionResponse(
                success=False,
                error_message=data.get("error_message") or _FALLBACK_ERROR,
            )

        updated_params: dict[str, Any] = {}
        raw_params = data.get("updated_params") or {}
        for key, value in raw_params.items():
            if value is not None:
                updated_params[key] = value

        constraints_raw: list[Any] = data.get("constraints_to_add") or []
        constraints: list[dict[str, Any]] = [
            c for c in constraints_raw if isinstance(c, dict)
        ]

        return ColumnInstructionResponse(
            success=True,
            updated_distribution_hint=data.get("updated_distribution_hint"),
            updated_params=updated_params,
            readable_summary=data.get("readable_summary"),
            constraints_to_add=constraints,
            error_message=None,
        )

    except Exception:
        logger.exception("Failed to build ColumnInstructionResponse from LLM response")
        return ColumnInstructionResponse(
            success=False,
            error_message="An unexpected error occurred while parsing the response.",
        )
