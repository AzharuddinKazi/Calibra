"""PDF audit report generation using ReportLab.

Produces a structured audit trail covering all 12 required sections.
The report is designed for model risk officers — every decision made
during the generation run is documented and reproducible.
"""

from __future__ import annotations

import io
import logging
from datetime import datetime
from typing import Any

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import (
    HRFlowable,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from backend.models.schemas import (
    ColumnProfile,
    FidelityScores,
    RunRecord,
)

logger = logging.getLogger(__name__)

# ── Style constants ────────────────────────────────────────────────────────────

_PAGE_WIDTH, _PAGE_HEIGHT = A4
_MARGIN = 2 * cm

_STYLES = getSampleStyleSheet()

_TITLE_STYLE = ParagraphStyle(
    "CalibraTitle",
    parent=_STYLES["Title"],
    fontSize=20,
    spaceAfter=6,
    textColor=colors.HexColor("#1E3A5F"),
)
_HEADING1_STYLE = ParagraphStyle(
    "CalibraH1",
    parent=_STYLES["Heading1"],
    fontSize=13,
    spaceBefore=14,
    spaceAfter=4,
    textColor=colors.HexColor("#1E3A5F"),
)
_HEADING2_STYLE = ParagraphStyle(
    "CalibraH2",
    parent=_STYLES["Heading2"],
    fontSize=11,
    spaceBefore=8,
    spaceAfter=3,
    textColor=colors.HexColor("#2C5282"),
)
_BODY_STYLE = ParagraphStyle(
    "CalibraBody",
    parent=_STYLES["Normal"],
    fontSize=9,
    leading=14,
    spaceAfter=4,
)
_MONO_STYLE = ParagraphStyle(
    "CalibraMono",
    parent=_STYLES["Code"],
    fontSize=8,
    leading=12,
    fontName="Courier",
)
_WARNING_STYLE = ParagraphStyle(
    "CalibraWarning",
    parent=_STYLES["Normal"],
    fontSize=9,
    leading=14,
    textColor=colors.HexColor("#C53030"),
    spaceAfter=4,
)

_TABLE_HEADER_BG = colors.HexColor("#2C5282")
_TABLE_ALT_ROW = colors.HexColor("#EBF4FF")
_TABLE_BASE_STYLE = TableStyle(
    [
        ("BACKGROUND", (0, 0), (-1, 0), _TABLE_HEADER_BG),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, _TABLE_ALT_ROW]),
        ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#CBD5E0")),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]
)


# ── Public entry point ─────────────────────────────────────────────────────────

def build_audit_report(
    run: RunRecord,
    column_profiles: list[ColumnProfile],
    executive_summary: str | None,
    agent_tool_calls: list[dict[str, Any]] | None = None,
) -> bytes:
    """Build a PDF audit report and return raw bytes.

    Parameters
    ----------
    run:
        The completed RunRecord with all generation metadata.
    column_profiles:
        Column profiles from the upload/profile phase.
    executive_summary:
        Plain-English summary from LLM Call 3 (or None for fallback text).
    agent_tool_calls:
        Optional list of tool call records if session was agent-first.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=_MARGIN,
        rightMargin=_MARGIN,
        topMargin=_MARGIN,
        bottomMargin=_MARGIN,
        title=f"Calibra Audit Report — {run.run_id}",
        author="Calibra Synthetic Data Engine",
    )

    story: list[Any] = []

    _add_cover(story, run)
    _add_section_1_metadata(story, run)
    _add_section_2_source_profile(story, column_profiles, run)
    _add_section_3_distributions(story, column_profiles)
    _add_section_4_domain_pack(story, run)
    _add_section_5_constraints(story, run)
    _add_section_6_constraint_failures(story, run)
    _add_section_7_prevalence(story, run)
    _add_section_8_fidelity(story, run)
    _add_section_9_fidelity_warning(story, run)
    _add_section_10_reproducibility(story, run)
    _add_section_11_llm_log(story, run)
    _add_section_12_session_origin(story, run, agent_tool_calls)
    _add_executive_summary(story, executive_summary)

    doc.build(story)
    return buffer.getvalue()


# ── Cover page ─────────────────────────────────────────────────────────────────

def _add_cover(story: list, run: RunRecord) -> None:
    story.append(Paragraph("Calibra Synthetic Data Engine", _TITLE_STYLE))
    story.append(Paragraph("Audit Report", _HEADING1_STYLE))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#2C5282")))
    story.append(Spacer(1, 0.3 * cm))
    story.append(Paragraph(f"Run ID: <font name='Courier'>{run.run_id}</font>", _BODY_STYLE))
    story.append(Paragraph(f"Generated: {run.created_at.strftime('%Y-%m-%d %H:%M UTC')}", _BODY_STYLE))
    story.append(Spacer(1, 0.5 * cm))


# ── Section 1 — Run metadata ───────────────────────────────────────────────────

def _add_section_1_metadata(story: list, run: RunRecord) -> None:
    story.append(Paragraph("1. Run Metadata", _HEADING1_STYLE))

    rows = [
        ["Field", "Value"],
        ["Run ID", run.run_id],
        ["Session ID", run.session_id],
        ["Timestamp", run.created_at.isoformat()],
        ["Random Seed", str(run.random_seed)],
        ["Rows Requested", f"{run.row_count_requested:,}"],
        ["Rows Delivered", f"{run.row_count_delivered:,}"],
        ["Status", run.status],
    ]
    story.append(_make_table(rows))
    story.append(Spacer(1, 0.3 * cm))


# ── Section 2 — Source data profile ──────────────────────────────────────────

def _add_section_2_source_profile(
    story: list, profiles: list[ColumnProfile], run: RunRecord
) -> None:
    story.append(Paragraph("2. Source Data Profile", _HEADING1_STYLE))

    if run.entry_point == "agent_first" and not profiles:
        story.append(
            Paragraph("No source dataset uploaded. Schema defined via agent.", _BODY_STYLE)
        )
        return

    story.append(
        Paragraph(f"Source file analysed: {len(profiles)} columns.", _BODY_STYLE)
    )

    rows = [["Column", "Type", "Null Rate", "Unique Count", "Mean / Top Values"]]
    for p in profiles:
        if p.stats.mean is not None:
            value_str = f"mean={p.stats.mean:.3f}"
        elif p.stats.top_values:
            value_str = ", ".join(str(v) for v in p.stats.top_values[:3])
        else:
            value_str = "—"
        rows.append(
            [
                p.name,
                p.col_type,
                f"{p.stats.null_rate:.1%}",
                str(p.stats.unique_count),
                value_str,
            ]
        )
    story.append(_make_table(rows))
    story.append(Spacer(1, 0.3 * cm))


# ── Section 3 — Fitted distributions ─────────────────────────────────────────

def _add_section_3_distributions(story: list, profiles: list[ColumnProfile]) -> None:
    story.append(Paragraph("3. Fitted Distributions", _HEADING1_STYLE))

    if not profiles:
        story.append(Paragraph("No source dataset — distributions not fitted.", _BODY_STYLE))
        return

    rows = [["Column", "Type", "Distribution", "Parameters"]]
    for p in profiles:
        dist = p.distribution or "—"
        params = (
            ", ".join(f"{k}={v:.4f}" for k, v in p.distribution_params.items())
            if p.distribution_params
            else "—"
        )
        rows.append([p.name, p.col_type, dist, params])
    story.append(_make_table(rows))
    story.append(Spacer(1, 0.3 * cm))


# ── Section 4 — Domain pack ───────────────────────────────────────────────────

def _add_section_4_domain_pack(story: list, run: RunRecord) -> None:
    story.append(Paragraph("4. Domain Pack Applied", _HEADING1_STYLE))

    if not run.domain_pack or run.domain_pack == "none":
        story.append(Paragraph("No domain pack applied.", _BODY_STYLE))
        return

    story.append(Paragraph(f"Pack: <b>{run.domain_pack}</b>", _BODY_STYLE))

    if run.domain_config:
        rows = [["Parameter", "Value"]]
        for k, v in run.domain_config.items():
            rows.append([str(k), str(v)])
        story.append(_make_table(rows))

    story.append(Spacer(1, 0.3 * cm))


# ── Section 5 — Constraints ───────────────────────────────────────────────────

def _add_section_5_constraints(story: list, run: RunRecord) -> None:
    story.append(Paragraph("5. Constraints Applied", _HEADING1_STYLE))

    constraints = run.domain_config.get("active_constraints", [])
    if not constraints:
        story.append(Paragraph("No additional constraints applied.", _BODY_STYLE))
        return

    rows = [["Rule Type", "Column(s)", "Parameters", "Source", "Summary"]]
    for c in constraints:
        col = c.get("column") or ", ".join(c.get("columns", [])) or "—"
        params = ", ".join(f"{k}={v}" for k, v in (c.get("params") or {}).items()) or "—"
        rows.append(
            [
                c.get("rule_type", "—"),
                col,
                params,
                c.get("source", "—"),
                c.get("readable_summary", "—"),
            ]
        )
    story.append(_make_table(rows))
    story.append(Spacer(1, 0.3 * cm))


# ── Section 6 — Constraint failures ──────────────────────────────────────────

def _add_section_6_constraint_failures(story: list, run: RunRecord) -> None:
    story.append(Paragraph("6. Constraint Failures", _HEADING1_STYLE))

    failures = run.constraint_failures
    if failures == 0:
        story.append(Paragraph("No rows were excluded due to constraint failures.", _BODY_STYLE))
    else:
        story.append(
            Paragraph(
                f"{failures:,} row(s) were excluded after failing constraint validation "
                "after 3 regeneration attempts. This is expected behaviour — the row count "
                "delivered may be slightly below the requested count.",
                _BODY_STYLE,
            )
        )
    story.append(Spacer(1, 0.3 * cm))


# ── Section 7 — Prevalence ────────────────────────────────────────────────────

def _add_section_7_prevalence(story: list, run: RunRecord) -> None:
    story.append(Paragraph("7. Prevalence Targets vs Actuals", _HEADING1_STYLE))

    if not run.prevalence_targets:
        story.append(Paragraph("No domain pack active — prevalence not applicable.", _BODY_STYLE))
        return

    rows = [["Class", "Target", "Actual", "Δ (pp)"]]
    for cls, target in run.prevalence_targets.items():
        actual = run.prevalence_actuals.get(cls, 0.0)
        delta = (actual - target) * 100
        rows.append(
            [cls, f"{target:.3%}", f"{actual:.3%}", f"{delta:+.3f}"]
        )
    story.append(_make_table(rows))
    story.append(Spacer(1, 0.3 * cm))


# ── Section 8 — Fidelity scores ───────────────────────────────────────────────

def _add_section_8_fidelity(story: list, run: RunRecord) -> None:
    story.append(Paragraph("8. Fidelity Scores", _HEADING1_STYLE))

    if run.fidelity_scores is None:
        if run.entry_point == "agent_first":
            story.append(
                Paragraph(
                    "Fidelity scores not applicable — no source dataset provided "
                    "(agent-first session).",
                    _BODY_STYLE,
                )
            )
        else:
            story.append(Paragraph("Fidelity scores not available.", _BODY_STYLE))
        return

    f = run.fidelity_scores
    rows = [
        ["Metric", "Score", "Weight"],
        ["Column Fidelity", f"{f.column_fidelity:.4f}", "60%"],
        ["Correlation Fidelity", f"{f.correlation_fidelity:.4f}", "40%"],
        ["Composite Score", f"{f.composite:.4f}", "—"],
    ]
    story.append(_make_table(rows))
    story.append(
        Paragraph(
            "Composite = 0.6 × column fidelity + 0.4 × correlation fidelity. "
            "Minimum acceptable threshold: 0.75.",
            _BODY_STYLE,
        )
    )
    story.append(Spacer(1, 0.3 * cm))


# ── Section 9 — Fidelity warning ──────────────────────────────────────────────

def _add_section_9_fidelity_warning(story: list, run: RunRecord) -> None:
    story.append(Paragraph("9. Fidelity Warning", _HEADING1_STYLE))

    if run.fidelity_scores is None:
        story.append(Paragraph("Not applicable.", _BODY_STYLE))
        return

    if run.fidelity_scores.composite < 0.75:
        story.append(
            Paragraph(
                "⚠ WARNING: Composite fidelity score is below the 0.75 threshold "
                f"(score: {run.fidelity_scores.composite:.4f}). "
                "The user confirmed download of below-threshold output. "
                "Exercise additional caution when using this dataset.",
                _WARNING_STYLE,
            )
        )
    else:
        story.append(
            Paragraph(
                f"Fidelity score ({run.fidelity_scores.composite:.4f}) meets the 0.75 threshold.",
                _BODY_STYLE,
            )
        )
    story.append(Spacer(1, 0.3 * cm))


# ── Section 10 — Reproducibility ─────────────────────────────────────────────

def _add_section_10_reproducibility(story: list, run: RunRecord) -> None:
    story.append(Paragraph("10. Reproducibility", _HEADING1_STYLE))
    story.append(
        Paragraph(
            "To reproduce this run, send the following request to POST /replay:",
            _BODY_STYLE,
        )
    )
    story.append(
        Paragraph(
            f'<font name="Courier">{"{"}"run_id": "{run.run_id}"{"}"}</font>',
            _BODY_STYLE,
        )
    )
    story.append(
        Paragraph(
            f"Random seed used: <font name='Courier'>{run.random_seed}</font>. "
            "All generation parameters are stored server-side against the run ID.",
            _BODY_STYLE,
        )
    )
    story.append(Spacer(1, 0.3 * cm))


# ── Section 11 — LLM assistance log ──────────────────────────────────────────

def _add_section_11_llm_log(story: list, run: RunRecord) -> None:
    story.append(Paragraph("11. LLM Assistance Log", _HEADING1_STYLE))
    story.append(
        Paragraph(
            "The following LLM touch points may have been used during this generation run. "
            "All LLM outputs required explicit user confirmation before being applied.",
            _BODY_STYLE,
        )
    )

    rows = [["Call", "Prompt Version", "Status"]]
    pv = run.prompt_versions_used

    annotate_v = pv.get("annotate", "annotate_columns_v1.txt")
    parse_v = pv.get("parse_constraint", "parse_constraints_v1.txt")
    summarise_v = pv.get("summarise", "summarise_report_v1.txt")

    rows.append(["Call 1 — Column Annotation", annotate_v, pv.get("annotate_status", "used")])
    rows.append(["Call 2 — Constraint Parser", parse_v, pv.get("parse_status", "optional")])
    rows.append(["Call 3 — Report Summariser", summarise_v, pv.get("summarise_status", "used")])

    story.append(_make_table(rows))
    story.append(Spacer(1, 0.3 * cm))


# ── Section 12 — Session origin ───────────────────────────────────────────────

def _add_section_12_session_origin(
    story: list,
    run: RunRecord,
    agent_tool_calls: list[dict[str, Any]] | None,
) -> None:
    story.append(Paragraph("12. Session Origin", _HEADING1_STYLE))

    entry = run.entry_point
    story.append(Paragraph(f"Entry point: <b>{entry.replace('_', '-')}</b>", _BODY_STYLE))

    if entry == "agent_first":
        agent_id = run.agent_session_id or "—"
        story.append(Paragraph(f"Agent session ID: <font name='Courier'>{agent_id}</font>", _BODY_STYLE))

        if agent_tool_calls:
            story.append(Paragraph("Tool calls made during configuration:", _HEADING2_STYLE))
            rows = [["Tool", "Inputs (summary)", "Result"]]
            for call in agent_tool_calls:
                inputs_str = str(call.get("inputs", {}))[:80]
                result_str = str(call.get("result", ""))[:60]
                rows.append([call.get("tool_name", "—"), inputs_str, result_str])
            story.append(_make_table(rows))
        else:
            story.append(Paragraph("No agent tool calls recorded.", _BODY_STYLE))
    else:
        story.append(
            Paragraph("Session created via upload-first flow.", _BODY_STYLE)
        )

    story.append(Spacer(1, 0.3 * cm))


# ── Executive summary (prepended visually, added last in story) ───────────────

def _add_executive_summary(story: list, summary: str | None) -> None:
    story.insert(
        5,  # after cover elements
        Spacer(1, 0.3 * cm),
    )
    story.insert(
        5,
        Paragraph(
            summary or "Executive summary unavailable — summary generation failed or timed out.",
            _BODY_STYLE,
        ),
    )
    story.insert(5, Paragraph("Executive Summary", _HEADING1_STYLE))


# ── Table helper ──────────────────────────────────────────────────────────────

def _make_table(rows: list[list[str]]) -> Table:
    col_count = len(rows[0]) if rows else 1
    available_width = _PAGE_WIDTH - 2 * _MARGIN
    col_width = available_width / col_count

    table = Table(rows, colWidths=[col_width] * col_count)
    table.setStyle(_TABLE_BASE_STYLE)
    return table
