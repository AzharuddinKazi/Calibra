"""/upload, /generate, and /replay endpoints."""

from __future__ import annotations

import io
import logging
import uuid
from datetime import datetime, timezone
from typing import Any

import pandas as pd
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import JSONResponse

from backend.constants import SESSION_TTL_HOURS
from backend.domain_packs.aml import get_domain_pack
from backend.engine.fidelity import compute_fidelity
from backend.engine.profiler import profile_dataframe
from backend.engine.sampler import make_rng, sample_from_profile, sample_from_schema
from backend.engine.validator import validate_dataframe
from backend.models.schemas import (
    ColumnProfile,
    GenerateRequest,
    GenerateResponse,
    ReplayRequest,
    RunRecord,
    Session,
    UploadResponse,
)
from backend.session.store import (
    create_session,
    get_session,
    make_session_expiry,
    update_session,
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["generation"])

# In-memory run store (v1 — same pattern as session store)
_run_store: dict[str, RunRecord] = {}
# In-memory output store for generated DataFrames (keyed by run_id)
_output_store: dict[str, pd.DataFrame] = {}


# ── GET /session/{session_id} ─────────────────────────────────────────────────

@router.get("/session/{session_id}")
async def get_session_data(session_id: str) -> dict:
    """Return session data including column profiles. Used by the frontend configure screen."""
    session = await get_session(session_id)
    if session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found or expired.",
        )
    return {
        "session_id": session.session_id,
        "row_count": session.row_count,
        "raw_filename": session.raw_filename,
        "column_profiles": [p.model_dump() for p in session.column_profile],
        "expires_at": session.expires_at.isoformat(),
    }


# ── POST /upload ───────────────────────────────────────────────────────────────

@router.post("/upload", response_model=UploadResponse)
async def upload_csv(file: UploadFile = File(...)) -> UploadResponse:
    """Accept a CSV file, profile it, and create a session."""
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Only CSV files are accepted.",
        )

    content = await file.read()
    if len(content) > 50 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File size exceeds 50 MB limit.",
        )

    try:
        df = pd.read_csv(io.BytesIO(content))
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Could not parse CSV: {exc}",
        ) from exc

    if df.empty or len(df.columns) == 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="CSV file is empty or has no columns.",
        )

    profiles = profile_dataframe(df)
    session_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)

    session = Session(
        session_id=session_id,
        created_at=now,
        expires_at=make_session_expiry(),
        column_profile=profiles,
        raw_filename=file.filename,
        row_count=len(df),
    )
    await create_session(session)

    logger.info("Uploaded CSV '%s': %d rows, %d columns, session %s",
                file.filename, len(df), len(df.columns), session_id)

    return UploadResponse(
        session_id=session_id,
        row_count=len(df),
        column_count=len(df.columns),
        expires_at=session.expires_at,
        column_profiles=profiles,
    )


# ── POST /generate ─────────────────────────────────────────────────────────────

@router.post("/generate", response_model=GenerateResponse)
async def generate(req: GenerateRequest) -> GenerateResponse:
    """Run the generation engine and return a run record.

    Handles both upload-first (session has column profiles from CSV) and
    agent-first (session is an AgentState with a schema defined via the agent).
    """
    # Try upload session first; fall back to agent session for agent-first flow.
    session = await get_session(req.session_id)
    agent_state = None
    if session is None:
        # Lazy import avoids a circular dependency at module load time.
        from backend.routers.agent import get_agent_session  # noqa: PLC0415
        agent_state = get_agent_session(req.session_id)
        if agent_state is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found or expired.",
            )

    rng = make_rng(req.random_seed)
    run_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)

    # Resolve domain pack — prefer agent config for agent-first flows.
    dp_name = (
        (agent_state.config.domain_pack or "none")
        if agent_state is not None
        else req.domain_pack
    )
    domain_pack_obj = None
    if dp_name and dp_name != "none":
        try:
            domain_pack_obj = get_domain_pack(dp_name)
        except KeyError:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Unknown domain pack: {dp_name}",
            )

    # Merge constraints from session/agent config and domain pack.
    if agent_state is not None:
        constraints = list(agent_state.config.constraints)
    else:
        constraints = list(session.active_constraints)  # type: ignore[union-attr]
    if domain_pack_obj:
        constraints.extend(domain_pack_obj.get_constraints(req.domain_config))

    # Resolve prevalence targets — agent config takes precedence for agent-first.
    prevalence_targets: dict[str, float] = {}
    if agent_state is not None and agent_state.config.prevalence:
        prevalence_targets = agent_state.config.prevalence
    elif domain_pack_obj:
        prev_config = domain_pack_obj.get_prevalence_config(req.domain_config)
        prevalence_targets = prev_config.targets

    # Sample synthetic data.
    try:
        if agent_state is not None:
            # Agent-first: schema was defined via the agent's define_schema tool.
            agent_config = agent_state.config
            if not agent_config.columns:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=(
                        "No column schema defined. Ask the agent to define columns before generating."
                    ),
                )
            # Propagate row_count from request into config for the sampler.
            agent_config.row_count = req.row_count
            synthetic_df = sample_from_schema(agent_config, req.row_count, rng)
        elif session.column_profile:  # type: ignore[union-attr]
            synthetic_df = sample_from_profile(
                session.column_profile,  # type: ignore[union-attr]
                req.row_count,
                rng,
                distribution_overrides=req.distribution_overrides or {},
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Session has no column data. Upload a CSV or define a schema via the agent.",
            )
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Sampling failed for session %s", req.session_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Generation failed: {exc}",
        ) from exc

    # Build the resampler for constraint validation.
    if agent_state is not None:
        _agent_cfg = agent_state.config

        def resample_row(_row: dict[str, Any]) -> dict[str, Any] | None:
            try:
                mini_df = sample_from_schema(_agent_cfg, 1, rng)
                return mini_df.iloc[0].to_dict() if not mini_df.empty else None
            except Exception:
                return None
    else:
        def resample_row(_row: dict[str, Any]) -> dict[str, Any] | None:
            mini_df = sample_from_profile(
                session.column_profile, 1, rng,  # type: ignore[union-attr]
                distribution_overrides=req.distribution_overrides or {},
            )
            return mini_df.iloc[0].to_dict() if not mini_df.empty else None

    validated_df, constraint_failures = validate_dataframe(
        synthetic_df, constraints, resample_row
    )

    # Fidelity only applies when we have source data (upload-first).
    fidelity_scores = None
    if session is not None and session.column_profile:
        try:
            real_df = _reconstruct_reference_df(session.column_profile)
            if real_df is not None:
                fidelity_scores = compute_fidelity(real_df, validated_df)
        except Exception:
            logger.warning("Fidelity computation failed for run %s", run_id, exc_info=True)

    _output_store[run_id] = validated_df

    run = RunRecord(
        run_id=run_id,
        session_id=req.session_id,
        created_at=now,
        row_count_requested=req.row_count,
        row_count_delivered=len(validated_df),
        domain_pack=dp_name if dp_name != "none" else None,
        domain_config=req.domain_config,
        random_seed=req.random_seed,
        fidelity_scores=fidelity_scores,
        constraint_failures=constraint_failures,
        prevalence_targets=prevalence_targets,
        status="complete",
        download_url=f"/download/{run_id}",
        report_url=f"/report/{run_id}",
        expires_at=make_session_expiry(),
        entry_point="agent_first" if agent_state is not None else "upload_first",
    )
    _run_store[run_id] = run

    logger.info(
        "Generation complete: run_id=%s, rows=%d/%d, failures=%d, entry=%s",
        run_id, len(validated_df), req.row_count, constraint_failures,
        run.entry_point,
    )

    return GenerateResponse(
        run_id=run_id,
        status="complete",
        fidelity_score=fidelity_scores.composite if fidelity_scores else None,
        constraint_failures=constraint_failures,
        download_url=run.download_url,
        report_url=run.report_url,
        expires_at=run.expires_at,
    )


# ── POST /replay ───────────────────────────────────────────────────────────────

@router.post("/replay", response_model=GenerateResponse)
async def replay(req: ReplayRequest) -> GenerateResponse:
    """Replay a previous generation run using stored parameters."""
    run = _run_store.get(req.run_id)
    if run is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Run not found or expired.",
        )

    replay_req = GenerateRequest(
        session_id=run.session_id,
        row_count=run.row_count_requested,
        domain_pack=run.domain_pack or "none",
        domain_config=run.domain_config,
        random_seed=run.random_seed,
    )
    return await generate(replay_req)


# ── Helpers ────────────────────────────────────────────────────────────────────

def get_run(run_id: str) -> RunRecord | None:
    """Return the RunRecord for a completed run, or None."""
    return _run_store.get(run_id)


def get_output_df(run_id: str) -> pd.DataFrame | None:
    """Return the generated DataFrame for a run, or None."""
    return _output_store.get(run_id)


def _reconstruct_reference_df(profiles) -> pd.DataFrame | None:
    """Stub — in production the original CSV would be retained in session storage."""
    return None
