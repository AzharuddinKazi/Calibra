"""Computes all visualisation data for the /preview/{run_id} endpoint.

Produces histogram bins, KDE curves, correlation matrices, and a 50-row
sample.  All computation is server-side — the frontend is purely presentational.
"""

from __future__ import annotations

import logging

import numpy as np
import pandas as pd
from scipy.stats import gaussian_kde

from backend.constants import HEATMAP_MAX_COLUMNS, HISTOGRAM_BINS, KDE_POINTS, SAMPLE_TABLE_ROWS
from backend.engine.fidelity import compute_column_js_divergences, compute_fidelity
from backend.models.schemas import (
    ColumnDistribution,
    ColumnStats2,
    CorrelationData,
    FidelityScores,
    HistogramData,
    KDEData,
    PrevalenceActuals,
    PreviewColumn,
    PreviewResponse,
)

logger = logging.getLogger(__name__)


def build_preview(
    run_id: str,
    real: pd.DataFrame | None,
    synthetic: pd.DataFrame,
    prevalence_targets: dict[str, float] | None = None,
    prevalence_actuals: dict[str, float] | None = None,
) -> PreviewResponse:
    """Build the full preview payload for a generation run.

    *real* may be None for agent-first runs (no source data).
    """
    fidelity = (
        compute_fidelity(real, synthetic)
        if real is not None
        else FidelityScores(composite=0.0, column_fidelity=0.0, correlation_fidelity=0.0)
    )

    js_scores = compute_column_js_divergences(real, synthetic) if real is not None else {}

    columns = _build_column_previews(real, synthetic, js_scores)
    correlation = _build_correlation(real, synthetic)
    sample_rows = _sample_rows(synthetic)

    prevalence: PrevalenceActuals | None = None
    if prevalence_targets and prevalence_actuals:
        prevalence = PrevalenceActuals(target=prevalence_targets, actual=prevalence_actuals)

    return PreviewResponse(
        run_id=run_id,
        fidelity=fidelity,
        prevalence=prevalence,
        columns=columns,
        correlation=correlation,
        sample_rows=sample_rows,
    )


# ── Per-column previews ────────────────────────────────────────────────────────

def _build_column_previews(
    real: pd.DataFrame | None,
    synthetic: pd.DataFrame,
    js_scores: dict[str, float],
) -> list[PreviewColumn]:
    previews: list[PreviewColumn] = []
    for col in synthetic.columns:
        real_col = real[col] if (real is not None and col in real.columns) else None
        synth_col = synthetic[col]

        is_numeric = pd.api.types.is_numeric_dtype(synth_col) or pd.api.types.is_bool_dtype(synth_col)

        if is_numeric:
            real_dist = _numeric_distribution(real_col) if real_col is not None else _empty_numeric_dist()
            synth_dist = _numeric_distribution(synth_col)
        else:
            real_dist = _categorical_distribution(real_col) if real_col is not None else _empty_categorical_dist()
            synth_dist = _categorical_distribution(synth_col)

        previews.append(PreviewColumn(
            name=str(col),
            type="continuous" if is_numeric else "categorical",
            real=real_dist,
            synthetic=synth_dist,
            js_divergence=js_scores.get(str(col), 0.0),
        ))
    return previews


def _numeric_distribution(col: pd.Series) -> ColumnDistribution:
    clean = col.dropna().astype(float)
    arr = clean.values

    if len(arr) == 0:
        return _empty_numeric_dist()

    col_min, col_max = float(arr.min()), float(arr.max())
    bins = np.linspace(col_min, col_max, HISTOGRAM_BINS + 1) if col_min < col_max else np.array([col_min, col_max + 1])
    counts, edges = np.histogram(arr, bins=bins)

    kde_data: KDEData | None = None
    if len(arr) >= 2 and col_min < col_max:
        try:
            kde = gaussian_kde(arr)
            x_vals = np.linspace(col_min, col_max, KDE_POINTS)
            kde_data = KDEData(x=x_vals.tolist(), y=kde(x_vals).tolist())
        except Exception:
            logger.debug("KDE failed for column %r", col.name)

    stats = ColumnStats2(
        mean=float(np.mean(arr)),
        stddev=float(np.std(arr)),
        min=col_min,
        max=col_max,
    )
    return ColumnDistribution(
        histogram=HistogramData(bins=edges.tolist(), counts=counts.tolist()),
        kde=kde_data,
        stats=stats,
    )


def _categorical_distribution(col: pd.Series) -> ColumnDistribution:
    clean = col.dropna().astype(str)
    freq = clean.value_counts()
    categories = freq.index.tolist()
    counts = freq.values.tolist()
    # Encode categories as ordinal ints for the histogram bins
    return ColumnDistribution(
        histogram=HistogramData(
            bins=list(range(len(categories) + 1)),
            counts=counts,
        ),
        kde=None,
        stats=None,
    )


def _empty_numeric_dist() -> ColumnDistribution:
    return ColumnDistribution(
        histogram=HistogramData(bins=[], counts=[]),
        kde=None,
        stats=None,
    )


def _empty_categorical_dist() -> ColumnDistribution:
    return ColumnDistribution(
        histogram=HistogramData(bins=[], counts=[]),
        kde=None,
        stats=None,
    )


# ── Correlation matrix ────────────────────────────────────────────────────────

def _build_correlation(
    real: pd.DataFrame | None,
    synthetic: pd.DataFrame,
) -> CorrelationData | None:
    numeric_cols = [
        c for c in synthetic.columns
        if pd.api.types.is_numeric_dtype(synthetic[c]) or pd.api.types.is_bool_dtype(synthetic[c])
    ]

    if len(numeric_cols) < 2:
        return None

    # Cap at HEATMAP_MAX_COLUMNS by variance
    if len(numeric_cols) > HEATMAP_MAX_COLUMNS:
        variances = synthetic[numeric_cols].var().sort_values(ascending=False)
        numeric_cols = variances.head(HEATMAP_MAX_COLUMNS).index.tolist()

    synth_corr = synthetic[numeric_cols].corr().fillna(0).values.tolist()

    if real is not None:
        real_shared = [c for c in numeric_cols if c in real.columns]
        real_corr = real[real_shared].corr().fillna(0).values.tolist() if real_shared else synth_corr
        col_names = real_shared if real_shared else numeric_cols
    else:
        real_corr = synth_corr
        col_names = numeric_cols

    return CorrelationData(real=real_corr, synthetic=synth_corr, column_names=col_names)


# ── Sample rows ───────────────────────────────────────────────────────────────

def _sample_rows(synthetic: pd.DataFrame) -> list[dict]:
    n = min(SAMPLE_TABLE_ROWS, len(synthetic))
    if n == 0:
        return []
    sample = synthetic.sample(n=n, random_state=0)
    return sample.where(pd.notna(sample), other=None).to_dict(orient="records")
