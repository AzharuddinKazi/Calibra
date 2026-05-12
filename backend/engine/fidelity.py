"""Fidelity scoring: JS divergence (column) + Frobenius norm (correlation).

Composite = 0.6 × column_fidelity + 0.4 × correlation_fidelity

Minimum acceptable composite: 0.75 (FIDELITY_WARNING_THRESHOLD).
"""

from __future__ import annotations

import logging

import numpy as np
import pandas as pd
from scipy.spatial.distance import jensenshannon
from scipy.stats import gaussian_kde

from backend.constants import (
    FIDELITY_COLUMN_WEIGHT,
    FIDELITY_CORRELATION_WEIGHT,
    HISTOGRAM_BINS,
)
from backend.models.schemas import FidelityScores

logger = logging.getLogger(__name__)


def compute_fidelity(real: pd.DataFrame, synthetic: pd.DataFrame) -> FidelityScores:
    """Compute composite fidelity between *real* and *synthetic* DataFrames.

    Columns present in both DataFrames are scored.  Missing or non-numeric
    columns are skipped without raising.
    """
    common_cols = [c for c in real.columns if c in synthetic.columns]
    numeric_cols = [
        c for c in common_cols
        if pd.api.types.is_numeric_dtype(real[c]) or pd.api.types.is_bool_dtype(real[c])
    ]

    col_fidelity = _column_fidelity(real, synthetic, common_cols)
    corr_fidelity = _correlation_fidelity(real, synthetic, numeric_cols)

    composite = FIDELITY_COLUMN_WEIGHT * col_fidelity + FIDELITY_CORRELATION_WEIGHT * corr_fidelity
    return FidelityScores(
        composite=round(composite, 4),
        column_fidelity=round(col_fidelity, 4),
        correlation_fidelity=round(corr_fidelity, 4),
    )


# ── Column fidelity (JS divergence) ───────────────────────────────────────────

def _column_fidelity(
    real: pd.DataFrame,
    synthetic: pd.DataFrame,
    columns: list[str],
) -> float:
    if not columns:
        return 1.0

    js_scores: list[float] = []
    for col in columns:
        try:
            js = _js_divergence_for_column(real[col], synthetic[col])
            js_scores.append(js)
        except Exception:
            logger.debug("Skipping JS divergence for column %r", col)

    if not js_scores:
        return 1.0

    mean_js = float(np.mean(js_scores))
    return max(0.0, 1.0 - mean_js)


def _js_divergence_for_column(real_col: pd.Series, synth_col: pd.Series) -> float:
    """Compute Jensen-Shannon divergence between two column distributions."""
    real_clean = real_col.dropna()
    synth_clean = synth_col.dropna()

    if len(real_clean) == 0 or len(synth_clean) == 0:
        return 0.0

    if pd.api.types.is_numeric_dtype(real_clean) or pd.api.types.is_bool_dtype(real_clean):
        return _js_continuous(real_clean.astype(float), synth_clean.astype(float))

    return _js_categorical(real_clean.astype(str), synth_clean.astype(str))


def _js_continuous(real: pd.Series, synth: pd.Series) -> float:
    """JS divergence via shared histogram bins."""
    combined_min = min(real.min(), synth.min())
    combined_max = max(real.max(), synth.max())

    if combined_min == combined_max:
        return 0.0

    bins = np.linspace(combined_min, combined_max, HISTOGRAM_BINS + 1)
    p, _ = np.histogram(real, bins=bins, density=True)
    q, _ = np.histogram(synth, bins=bins, density=True)

    # Normalise to probability distributions
    p = p + 1e-10
    q = q + 1e-10
    p /= p.sum()
    q /= q.sum()

    js = float(jensenshannon(p, q, base=2))
    return min(js, 1.0)


def _js_categorical(real: pd.Series, synth: pd.Series) -> float:
    """JS divergence via category frequency tables."""
    all_cats = set(real.unique()) | set(synth.unique())
    real_freq = real.value_counts(normalize=True)
    synth_freq = synth.value_counts(normalize=True)

    p = np.array([real_freq.get(c, 0.0) for c in all_cats]) + 1e-10
    q = np.array([synth_freq.get(c, 0.0) for c in all_cats]) + 1e-10
    p /= p.sum()
    q /= q.sum()

    js = float(jensenshannon(p, q, base=2))
    return min(js, 1.0)


# ── Correlation fidelity (Frobenius norm) ─────────────────────────────────────

def _correlation_fidelity(
    real: pd.DataFrame,
    synthetic: pd.DataFrame,
    numeric_cols: list[str],
) -> float:
    if len(numeric_cols) < 2:
        return 1.0

    real_num = real[numeric_cols].apply(pd.to_numeric, errors="coerce").dropna(axis=1, how="all")
    synth_num = synthetic[numeric_cols].apply(pd.to_numeric, errors="coerce").dropna(axis=1, how="all")

    shared = [c for c in real_num.columns if c in synth_num.columns]
    if len(shared) < 2:
        return 1.0

    corr_real = real_num[shared].corr().fillna(0).values
    corr_synth = synth_num[shared].corr().fillna(0).values

    diff = corr_real - corr_synth
    frob_norm = float(np.linalg.norm(diff, "fro"))

    n = len(shared)
    # Maximum possible Frobenius norm for an n×n matrix with values in [-2, 2]
    max_norm = 2.0 * np.sqrt(n * n)
    normalised = frob_norm / max_norm if max_norm > 0 else 0.0

    return max(0.0, 1.0 - normalised)


# ── Per-column JS divergence (for preview endpoint) ───────────────────────────

def compute_column_js_divergences(
    real: pd.DataFrame, synthetic: pd.DataFrame
) -> dict[str, float]:
    """Return a mapping of column_name → JS divergence for all shared columns."""
    result: dict[str, float] = {}
    for col in real.columns:
        if col not in synthetic.columns:
            continue
        try:
            result[col] = _js_divergence_for_column(real[col], synthetic[col])
        except Exception:
            logger.debug("Could not compute JS for column %r", col)
    return result
