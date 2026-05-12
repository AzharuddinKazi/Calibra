"""Six agent tool definitions and their handlers.

Tool handlers mutate AgentState in-place and return a plain-string result
message. They never raise — errors are returned as result strings.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from backend.agent.state import AgentState, ToolCallRecord
from backend.intelligence.constraint_parser import parse_constraint
from backend.models.schemas import ColumnSpec, Constraint, GenerationConfig

logger = logging.getLogger(__name__)


# ── Anthropic-format tool definitions ─────────────────────────────────────────

TOOL_DEFINITIONS: list[dict[str, Any]] = [
    {
        "name": "set_domain_pack",
        "description": "Set the domain pack and typologies in the generation config.",
        "input_schema": {
            "type": "object",
            "properties": {
                "domain_pack": {
                    "type": "string",
                    "enum": ["fraud", "aml", "none"],
                },
                "typologies": {
                    "type": "array",
                    "items": {
                        "type": "string",
                        "enum": [
                            "card_not_present",
                            "account_takeover",
                            "synthetic_identity",
                            "first_party_fraud",
                            "structuring",
                            "fan_out",
                            "fan_in",
                            "scatter_gather",
                            "circular_flow",
                        ],
                    },
                    "default": [],
                },
            },
            "required": ["domain_pack"],
        },
    },
    {
        "name": "set_prevalence",
        "description": (
            "Set class prevalence targets. Values must sum to 1.0. "
            'Example: {"fraud": 0.02, "non_fraud": 0.98}'
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "prevalence": {
                    "type": "object",
                    "description": "Class name → float fraction. Must sum to 1.0.",
                },
            },
            "required": ["prevalence"],
        },
    },
    {
        "name": "add_constraint",
        "description": (
            "Add a constraint via a plain-English description. "
            "The description is parsed into a formal constraint schema."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "description": {"type": "string"},
            },
            "required": ["description"],
        },
    },
    {
        "name": "define_schema",
        "description": (
            "Define the column schema from scratch (agent-first path only, "
            "when no CSV was uploaded)."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "columns": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "name": {"type": "string"},
                            "type": {
                                "type": "string",
                                "enum": [
                                    "continuous",
                                    "categorical",
                                    "datetime",
                                    "boolean",
                                    "id",
                                ],
                            },
                            "distribution_hint": {
                                "type": "string",
                                "enum": [
                                    "normal",
                                    "lognormal",
                                    "uniform",
                                    "exponential",
                                    "categorical",
                                ],
                            },
                            "sample_values": {"type": "array"},
                        },
                        "required": ["name", "type"],
                    },
                },
            },
            "required": ["columns"],
        },
    },
    {
        "name": "run_preview",
        "description": (
            "Trigger a lightweight generation preview run (max 500 rows) using "
            "the current config. Stores the preview run_id in agent state."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "row_count": {
                    "type": "integer",
                    "default": 200,
                    "maximum": 500,
                },
            },
        },
    },
    {
        "name": "mark_ready",
        "description": (
            "Mark the configuration as complete and ready for generation. "
            "Sets ready_to_generate=True and shows a summary to the user."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "summary": {
                    "type": "string",
                    "description": (
                        "One-paragraph plain-English config summary shown to "
                        "the user before they confirm generation."
                    ),
                },
            },
            "required": ["summary"],
        },
    },
]


# ── Handlers ───────────────────────────────────────────────────────────────────

async def execute_tool(
    tool_name: str,
    tool_input: dict[str, Any],
    state: AgentState,
) -> str:
    """Dispatch a tool call to the appropriate handler.

    Returns a plain-string result. Never raises.
    """
    handlers = {
        "set_domain_pack": _handle_set_domain_pack,
        "set_prevalence": _handle_set_prevalence,
        "add_constraint": _handle_add_constraint,
        "define_schema": _handle_define_schema,
        "run_preview": _handle_run_preview,
        "mark_ready": _handle_mark_ready,
    }

    handler = handlers.get(tool_name)
    if handler is None:
        result = f"Unknown tool: {tool_name}"
        logger.warning(result)
        return result

    try:
        result = await handler(tool_input, state)
    except Exception as exc:
        result = f"Tool {tool_name} failed: {exc}"
        logger.exception("Unexpected error in tool handler %s", tool_name)

    state.tool_calls_log.append(
        ToolCallRecord(
            tool_name=tool_name,
            inputs=tool_input,
            result=result,
            called_at=datetime.now(timezone.utc),
        )
    )
    return result


async def _handle_set_domain_pack(
    inputs: dict[str, Any], state: AgentState
) -> str:
    domain_pack = inputs.get("domain_pack", "none")
    typologies: list[str] = inputs.get("typologies", [])

    valid_packs = {"fraud", "aml", "none"}
    if domain_pack not in valid_packs:
        return f"Invalid domain_pack '{domain_pack}'. Must be one of {sorted(valid_packs)}."

    state.config.domain_pack = domain_pack
    state.config.typologies = list(typologies)

    typo_str = f" with typologies: {typologies}" if typologies else ""
    return f"Domain pack set to '{domain_pack}'{typo_str}."


async def _handle_set_prevalence(
    inputs: dict[str, Any], state: AgentState
) -> str:
    prevalence: dict[str, float] = inputs.get("prevalence", {})

    if not prevalence:
        return "No prevalence values provided."

    try:
        prevalence = {k: float(v) for k, v in prevalence.items()}
    except (TypeError, ValueError) as exc:
        return f"Invalid prevalence values: {exc}"

    total = sum(prevalence.values())
    if abs(total - 1.0) > 1e-6:
        return f"Prevalence values must sum to 1.0, got {total:.6f}."

    state.config.prevalence = prevalence
    summary = ", ".join(f"{k}={v:.3f}" for k, v in prevalence.items())
    return f"Prevalence set: {summary}."


async def _handle_add_constraint(
    inputs: dict[str, Any], state: AgentState
) -> str:
    description: str = inputs.get("description", "").strip()
    if not description:
        return "No constraint description provided."

    profiles = []
    if state.upload_session_id:
        from backend.session.store import get_session
        session = await get_session(state.upload_session_id)
        if session:
            profiles = session.column_profile
    elif state.config.columns:
        from backend.models.schemas import ColumnProfile, ColumnStats
        profiles = [
            ColumnProfile(
                name=col.name,
                col_type=col.col_type,
                stats=ColumnStats(),
            )
            for col in state.config.columns
        ]

    parse_result = parse_constraint(description, profiles)

    if parse_result.constraint is None:
        msg = parse_result.message or "Could not parse constraint."
        return f"Constraint not added: {msg}"

    if not parse_result.constraint.parseable:
        error = parse_result.constraint.parse_error or "Constraint not parseable."
        return f"Constraint not added: {error}"

    constraint = Constraint(
        rule_type=parse_result.constraint.rule_type,
        column=parse_result.constraint.column,
        params=parse_result.constraint.params or {},
        readable_summary=parse_result.constraint.readable_summary,
        source="agent",
    )
    state.config.constraints.append(constraint)
    summary = parse_result.constraint.readable_summary or description
    return f"Constraint added: {summary}"


async def _handle_define_schema(
    inputs: dict[str, Any], state: AgentState
) -> str:
    columns_raw: list[dict[str, Any]] = inputs.get("columns", [])
    if not columns_raw:
        return "No columns provided."

    columns: list[ColumnSpec] = []
    for col_data in columns_raw:
        name = col_data.get("name", "").strip()
        col_type = col_data.get("type", "")
        if not name or not col_type:
            return f"Column missing required fields 'name' or 'type': {col_data}"
        columns.append(
            ColumnSpec(
                name=name,
                col_type=col_type,
                distribution_hint=col_data.get("distribution_hint"),
                sample_values=col_data.get("sample_values", []),
            )
        )

    state.config.columns = columns
    names = [c.name for c in columns]
    return f"Schema defined with {len(columns)} columns: {names}."


async def _handle_run_preview(
    inputs: dict[str, Any], state: AgentState
) -> str:
    row_count: int = min(int(inputs.get("row_count", 200)), 500)

    if not _config_ready_for_preview(state.config):
        return (
            "Cannot run preview: configuration is incomplete. "
            "Ensure domain pack, prevalence, and either an uploaded dataset "
            "or a defined schema are set."
        )

    import uuid
    preview_run_id = f"preview_{uuid.uuid4().hex[:12]}"
    state.preview_run_id = preview_run_id

    return (
        f"Preview run queued with run_id='{preview_run_id}' for {row_count} rows. "
        "Results will appear inline."
    )


async def _handle_mark_ready(
    inputs: dict[str, Any], state: AgentState
) -> str:
    summary: str = inputs.get("summary", "").strip()
    if not summary:
        return "mark_ready requires a non-empty summary."

    state.config.ready_to_generate = True
    return f"Configuration marked ready. Summary: {summary}"


# ── Helpers ────────────────────────────────────────────────────────────────────

def _config_ready_for_preview(config: GenerationConfig) -> bool:
    has_schema = config.columns is not None
    has_domain = config.domain_pack is not None
    return has_schema or has_domain
