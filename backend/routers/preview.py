"""/preview/{run_id} endpoint."""

from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, status

from backend.engine.previewer import build_preview
from backend.models.schemas import PreviewResponse

logger = logging.getLogger(__name__)

router = APIRouter(tags=["preview"])


@router.get("/preview/{run_id}", response_model=PreviewResponse)
async def get_preview(run_id: str) -> PreviewResponse:
    """Return pre-computed visualisation data for a completed run."""
    from backend.routers.generation import get_output_df, get_run

    run = get_run(run_id)
    if run is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Run not found or expired.",
        )

    synthetic_df = get_output_df(run_id)
    if synthetic_df is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Output data not available for this run.",
        )

    preview = build_preview(
        run_id=run_id,
        real=None,
        synthetic=synthetic_df,
        prevalence_targets=run.prevalence_targets or None,
        prevalence_actuals=run.prevalence_actuals or None,
    )
    return preview
