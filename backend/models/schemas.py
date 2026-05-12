"""Pydantic schemas for all Calibra API request and response objects."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator


# ── Column profile ─────────────────────────────────────────────────────────────

class ColumnStats(BaseModel):
    mean: float | None = None
    stddev: float | None = None
    min: float | None = None
    max: float | None = None
    null_rate: float = 0.0
    top_values: list[Any] = Field(default_factory=list)
    unique_count: int = 0


class ColumnProfile(BaseModel):
    name: str
    col_type: Literal["continuous", "categorical", "datetime", "boolean", "id"]
    distribution: Literal["normal", "lognormal", "uniform", "exponential", "categorical"] | None = None
    distribution_params: dict[str, Any] = Field(default_factory=dict)
    stats: ColumnStats


# ── Distribution override ──────────────────────────────────────────────────────

class DistributionOverride(BaseModel):
    distribution: Literal["normal", "lognormal", "uniform", "exponential", "categorical"] | None = None
    params: dict[str, Any] = Field(default_factory=dict)


# ── Constraints ────────────────────────────────────────────────────────────────

class Constraint(BaseModel):
    rule_type: Literal["bound", "conditional", "relational", "temporal"]
    column: str | None = None
    columns: list[str] | None = None
    params: dict[str, Any] = Field(default_factory=dict)
    readable_summary: str | None = None
    source: Literal["domain_pack", "user_nl", "user_manual", "agent"] = "user_manual"


# ── Prevalence ─────────────────────────────────────────────────────────────────

class PrevalenceConfig(BaseModel):
    targets: dict[str, float]   # class_name → fraction, must sum to 1.0

    @field_validator("targets")
    @classmethod
    def must_sum_to_one(cls, v: dict[str, float]) -> dict[str, float]:
        total = sum(v.values())
        if abs(total - 1.0) > 1e-6:
            raise ValueError(f"Prevalence targets must sum to 1.0, got {total}")
        return v


# ── Column annotation (LLM Call 1 output) ─────────────────────────────────────

class ColumnAnnotation(BaseModel):
    name: str
    semantic_label: str | None = None
    suggested_constraint: dict[str, Any] | None = None
    reasoning: str | None = None


class AnnotationResponse(BaseModel):
    columns: list[ColumnAnnotation]
    recommended_domain_pack: Literal["fraud", "aml", "none"]
    recommended_typologies: list[str] = Field(default_factory=list)


# ── Constraint parse (LLM Call 2 output) ──────────────────────────────────────

class ParsedConstraint(BaseModel):
    parseable: bool
    confidence: Literal["high", "low"]
    rule_type: Literal["bound", "conditional", "relational", "temporal"] | None = None
    column: str | None = None
    params: dict[str, Any] | None = None
    readable_summary: str | None = None
    parse_error: str | None = None


# ── Session ────────────────────────────────────────────────────────────────────

class Session(BaseModel):
    session_id: str
    created_at: datetime
    expires_at: datetime
    column_profile: list[ColumnProfile] = Field(default_factory=list)
    raw_filename: str = ""
    row_count: int = 0
    annotations: list[ColumnAnnotation] | None = None
    active_constraints: list[Constraint] = Field(default_factory=list)
    domain_pack: Literal["fraud", "aml", "none"] | None = None
    domain_config: dict[str, Any] = Field(default_factory=dict)


# ── Upload ─────────────────────────────────────────────────────────────────────

class UploadResponse(BaseModel):
    session_id: str
    row_count: int
    column_count: int
    expires_at: datetime
    column_profiles: list["ColumnProfile"] = Field(default_factory=list)


# ── Generation ────────────────────────────────────────────────────────────────

class GenerateRequest(BaseModel):
    session_id: str
    row_count: int = Field(gt=0)
    domain_pack: Literal["fraud", "aml", "none"] = "none"
    domain_config: dict[str, Any] = Field(default_factory=dict)
    random_seed: int = 42
    distribution_overrides: dict[str, "DistributionOverride"] = Field(default_factory=dict)


class GenerateResponse(BaseModel):
    run_id: str
    status: Literal["queued", "processing", "complete", "failed"]
    fidelity_score: float | None = None
    constraint_failures: int = 0
    download_url: str | None = None
    report_url: str | None = None
    expires_at: datetime | None = None


# ── Replay ────────────────────────────────────────────────────────────────────

class ReplayRequest(BaseModel):
    run_id: str


# ── Intelligence ──────────────────────────────────────────────────────────────

class AnnotateRequest(BaseModel):
    session_id: str


class ParseConstraintRequest(BaseModel):
    session_id: str
    natural_language: str


class ParseConstraintResponse(BaseModel):
    constraint: ParsedConstraint | None = None
    readable_summary: str | None = None
    confidence: Literal["high", "low"] | None = None
    message: str | None = None   # populated on failure


# ── Preview ───────────────────────────────────────────────────────────────────

class FidelityScores(BaseModel):
    composite: float
    column_fidelity: float
    correlation_fidelity: float


class HistogramData(BaseModel):
    bins: list[float]
    counts: list[int]


class KDEData(BaseModel):
    x: list[float]
    y: list[float]


class ColumnStats2(BaseModel):
    mean: float
    stddev: float
    min: float
    max: float


class ColumnDistribution(BaseModel):
    histogram: HistogramData
    kde: KDEData | None = None   # None for categorical
    stats: ColumnStats2 | None = None


class PreviewColumn(BaseModel):
    name: str
    type: str
    real: ColumnDistribution
    synthetic: ColumnDistribution
    js_divergence: float


class PrevalenceActuals(BaseModel):
    target: dict[str, float]
    actual: dict[str, float]


class CorrelationData(BaseModel):
    real: list[list[float]]
    synthetic: list[list[float]]
    column_names: list[str]


class PreviewResponse(BaseModel):
    run_id: str
    fidelity: FidelityScores
    prevalence: PrevalenceActuals | None = None
    columns: list[PreviewColumn]
    correlation: CorrelationData | None = None
    sample_rows: list[dict[str, Any]] = Field(default_factory=list)


# ── Agent ─────────────────────────────────────────────────────────────────────

class ColumnSpec(BaseModel):
    name: str
    col_type: Literal["continuous", "categorical", "datetime", "boolean", "id"]
    distribution_hint: Literal["normal", "lognormal", "uniform", "exponential", "categorical"] | None = None
    sample_values: list[Any] = Field(default_factory=list)


class GenerationConfig(BaseModel):
    domain_pack: Literal["fraud", "aml", "none"] | None = None
    typologies: list[str] = Field(default_factory=list)
    row_count: int | None = None
    prevalence: dict[str, float] | None = None
    constraints: list[Constraint] = Field(default_factory=list)
    columns: list[ColumnSpec] | None = None
    distribution_hints: dict[str, str] | None = None
    ready_to_generate: bool = False


class AgentMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str | list[Any]


class AgentSessionRequest(BaseModel):
    mode: Literal["chat", "wizard"]
    entry_point: Literal["agent_first", "upload_first"]
    upload_session_id: str | None = None


class AgentSessionResponse(BaseModel):
    session_id: str
    mode: Literal["chat", "wizard"]
    config: GenerationConfig
    expires_at: datetime


class AgentMessageRequest(BaseModel):
    session_id: str
    message: str


class AgentMessageResponse(BaseModel):
    reply: str
    updated_config: GenerationConfig
    tool_calls_made: list[str] = Field(default_factory=list)
    ready_to_generate: bool = False
    preview_run_id: str | None = None
    suggestions: list[str] = Field(default_factory=list)


# ── Auth ──────────────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    email: str
    password: str


class UserLogin(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    user_id: str
    email: str


# ── Run record (server-side) ───────────────────────────────────────────────────

class RunRecord(BaseModel):
    run_id: str
    session_id: str
    created_at: datetime
    row_count_requested: int
    row_count_delivered: int
    domain_pack: str | None
    domain_config: dict[str, Any]
    random_seed: int
    fidelity_scores: FidelityScores | None = None
    constraint_failures: int = 0
    prevalence_targets: dict[str, float] = Field(default_factory=dict)
    prevalence_actuals: dict[str, float] = Field(default_factory=dict)
    prompt_versions_used: dict[str, str] = Field(default_factory=dict)
    agent_session_id: str | None = None
    entry_point: Literal["upload_first", "agent_first"] = "upload_first"
    status: Literal["queued", "processing", "complete", "failed"] = "queued"
    download_url: str | None = None
    report_url: str | None = None
    expires_at: datetime | None = None
