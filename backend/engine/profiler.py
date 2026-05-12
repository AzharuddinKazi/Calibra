"""Column type inference and distribution fitting.

Accepts a pandas DataFrame and returns a list of ColumnProfile objects.
No raw data rows leave this module — only statistical summaries are produced.
"""

from __future__ import annotations

import logging
from typing import Any

import numpy as np
import pandas as pd
from scipy import stats

from backend.constants import CATEGORICAL_UNIQUE_THRESHOLD
from backend.models.schemas import ColumnProfile, ColumnStats

logger = logging.getLogger(__name__)


def profile_dataframe(df: pd.DataFrame) -> list[ColumnProfile]:
    """Infer column types and fit distributions for every column in *df*.

    Returns one ColumnProfile per column. Columns that cannot be parsed
    are flagged as type 'id' rather than raising.
    """
    profiles: list[ColumnProfile] = []
    for col in df.columns:
        try:
            profile = _profile_column(df[col])
        except Exception:
            logger.exception("Failed to profile column %r — marking as id", col)
            profile = ColumnProfile(
                name=str(col),
                col_type="id",
                stats=_base_stats(df[col]),
            )
        profiles.append(profile)
    return profiles


# ── Column-level dispatch ──────────────────────────────────────────────────────

def _profile_column(series: pd.Series) -> ColumnProfile:
    name = str(series.name)
    null_rate = series.isna().mean()
    clean = series.dropna()

    col_type = _infer_type(series)

    if col_type == "continuous":
        dist, params = _fit_continuous(clean.astype(float))
        return ColumnProfile(
            name=name,
            col_type="continuous",
            distribution=dist,
            distribution_params=params,
            stats=_numeric_stats(clean.astype(float), null_rate),
        )

    if col_type == "boolean":
        p = float(clean.astype(int).mean())
        return ColumnProfile(
            name=name,
            col_type="boolean",
            distribution="categorical",
            distribution_params={"p": p},
            stats=_base_stats(series),
        )

    if col_type == "categorical":
        freq = clean.astype(str).value_counts(normalize=True).to_dict()
        return ColumnProfile(
            name=name,
            col_type="categorical",
            distribution="categorical",
            distribution_params={"frequencies": freq},
            stats=_base_stats(series),
        )

    if col_type == "datetime":
        return _profile_datetime(series, name, null_rate)

    # id
    return ColumnProfile(
        name=name,
        col_type="id",
        stats=_base_stats(series),
    )


# ── Type inference ─────────────────────────────────────────────────────────────

def _infer_type(series: pd.Series) -> str:
    """Return one of: continuous, categorical, datetime, boolean, id."""
    clean = series.dropna()
    if len(clean) == 0:
        return "categorical"

    # Boolean: binary 0/1 or True/False
    unique_vals = set(clean.unique())
    if unique_vals <= {0, 1} or unique_vals <= {True, False} or unique_vals <= {"0", "1"}:
        return "boolean"

    # Datetime: attempt parse
    if _is_datetime(series):
        return "datetime"

    # Numeric path
    if pd.api.types.is_numeric_dtype(clean):
        n_unique = clean.nunique()
        if n_unique <= CATEGORICAL_UNIQUE_THRESHOLD:
            return "categorical"
        # High-cardinality sequential int → id
        if pd.api.types.is_integer_dtype(clean):
            if _looks_like_id(clean):
                return "id"
        return "continuous"

    # String path
    n_unique = clean.nunique()
    total = len(clean)
    # Very high cardinality strings → id
    if n_unique / total > 0.95 and total > 50:
        return "id"
    return "categorical"


def _is_datetime(series: pd.Series) -> bool:
    if pd.api.types.is_datetime64_any_dtype(series):
        return True
    if not pd.api.types.is_object_dtype(series):
        return False
    sample = series.dropna().head(20)
    try:
        pd.to_datetime(sample, infer_datetime_format=True)
        return True
    except Exception:
        return False


def _looks_like_id(series: pd.Series) -> bool:
    """True if the series looks like a sequential or near-sequential integer key."""
    n_unique = series.nunique()
    total = len(series)
    return n_unique / total > 0.95 and total > 50


# ── Distribution fitting ───────────────────────────────────────────────────────

def _fit_continuous(data: pd.Series) -> tuple[str, dict[str, float]]:
    """Fit normal and lognormal; use KS test to select the better fit.

    Returns (distribution_name, params_dict).
    """
    arr = data.values.astype(float)
    arr = arr[np.isfinite(arr)]
    if len(arr) < 3:
        return "normal", {"loc": float(np.mean(arr)), "scale": float(np.std(arr)) or 1.0}

    # Normal fit
    mu, sigma = stats.norm.fit(arr)
    ks_normal, _ = stats.kstest(arr, "norm", args=(mu, sigma))

    # Lognormal fit (requires all-positive data)
    if np.all(arr > 0):
        shape, loc, scale = stats.lognorm.fit(arr, floc=0)
        ks_lognormal, _ = stats.kstest(arr, "lognorm", args=(shape, loc, scale))
    else:
        ks_lognormal = float("inf")
        shape, loc, scale = 1.0, 0.0, 1.0

    if ks_lognormal < ks_normal:
        return "lognormal", {"s": float(shape), "loc": float(loc), "scale": float(scale)}
    return "normal", {"loc": float(mu), "scale": float(sigma)}


# ── Datetime profiling ────────────────────────────────────────────────────────

def _profile_datetime(series: pd.Series, name: str, null_rate: float) -> ColumnProfile:
    parsed = pd.to_datetime(series.dropna(), infer_datetime_format=True, errors="coerce").dropna()
    hour_freq = parsed.dt.hour.value_counts(normalize=True).to_dict()
    dow_freq = parsed.dt.dayofweek.value_counts(normalize=True).to_dict()

    intervals: list[float] = []
    if len(parsed) > 1:
        deltas = parsed.sort_values().diff().dropna().dt.total_seconds()
        intervals = deltas[deltas > 0].tolist()

    interval_params: dict[str, float] = {}
    if intervals:
        mu, sigma = float(np.mean(intervals)), float(np.std(intervals))
        interval_params = {"mean_seconds": mu, "std_seconds": sigma}

    return ColumnProfile(
        name=name,
        col_type="datetime",
        distribution="categorical",
        distribution_params={
            "hour_frequencies": {str(k): v for k, v in hour_freq.items()},
            "dow_frequencies": {str(k): v for k, v in dow_freq.items()},
            "interval": interval_params,
        },
        stats=ColumnStats(
            null_rate=null_rate,
            unique_count=int(series.nunique()),
            min=float(parsed.min().timestamp()) if len(parsed) else None,
            max=float(parsed.max().timestamp()) if len(parsed) else None,
        ),
    )


# ── Stats helpers ─────────────────────────────────────────────────────────────

def _numeric_stats(data: pd.Series, null_rate: float = 0.0) -> ColumnStats:
    arr = data.values.astype(float)
    arr = arr[np.isfinite(arr)]
    top_vals: list[Any] = (
        data.value_counts().head(5).index.tolist() if len(data) > 0 else []
    )
    return ColumnStats(
        mean=float(np.mean(arr)) if len(arr) else None,
        stddev=float(np.std(arr)) if len(arr) else None,
        min=float(np.min(arr)) if len(arr) else None,
        max=float(np.max(arr)) if len(arr) else None,
        null_rate=null_rate,
        top_values=top_vals,
        unique_count=int(data.nunique()),
    )


def _base_stats(series: pd.Series) -> ColumnStats:
    null_rate = float(series.isna().mean())
    top_vals: list[Any] = (
        series.dropna().value_counts().head(5).index.tolist()
        if len(series.dropna()) > 0
        else []
    )
    return ColumnStats(
        null_rate=null_rate,
        top_values=top_vals,
        unique_count=int(series.nunique()),
    )
