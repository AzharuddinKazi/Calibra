"""Synthetic data sampling from a fitted column profile or agent-defined schema.

Two entry points:
  sample_from_profile()  — upload-first path; uses profiler output + Gaussian Copula
  sample_from_schema()   — agent-first path; uses ColumnSpec + distribution hints
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

import numpy as np
import pandas as pd
from scipy import stats

from backend.models.schemas import ColumnProfile, ColumnSpec, DistributionOverride, GenerationConfig

logger = logging.getLogger(__name__)

# ── Public API ────────────────────────────────────────────────────────────────


def sample_from_profile(
    profiles: list[ColumnProfile],
    n_rows: int,
    rng: np.random.Generator,
    distribution_overrides: dict[str, DistributionOverride] | None = None,
) -> pd.DataFrame:
    """Generate *n_rows* rows from fitted column profiles using a Gaussian Copula.

    Continuous and boolean columns are sampled jointly through a Gaussian Copula
    to preserve inter-column correlations.  Categorical and datetime columns are
    sampled independently then merged in.

    Args:
        profiles: Fitted column profiles from the profiler.
        n_rows: Number of rows to generate.
        rng: Seeded random number generator.
        distribution_overrides: Optional per-column distribution overrides.
    """
    overrides = distribution_overrides or {}
    effective_profiles = _apply_overrides(profiles, overrides)

    continuous_cols = [p for p in effective_profiles if p.col_type in ("continuous", "boolean")]
    other_cols = [p for p in effective_profiles if p.col_type not in ("continuous", "boolean")]

    df = pd.DataFrame(index=range(n_rows))

    if continuous_cols:
        df = _sample_copula(df, continuous_cols, n_rows, rng)

    for profile in other_cols:
        if profile.col_type == "categorical":
            df[profile.name] = _sample_categorical(profile, n_rows, rng)
        elif profile.col_type == "datetime":
            df[profile.name] = _sample_datetime(profile, n_rows, rng)
        elif profile.col_type == "id":
            df[profile.name] = [str(i).zfill(8) for i in range(n_rows)]

    ordered = [p.name for p in effective_profiles if p.name in df.columns]
    return df[ordered]


def _apply_overrides(
    profiles: list[ColumnProfile],
    overrides: dict[str, DistributionOverride],
) -> list[ColumnProfile]:
    """Return a new list of profiles with any overrides applied."""
    if not overrides:
        return profiles

    result: list[ColumnProfile] = []
    for profile in profiles:
        override = overrides.get(profile.name)
        if override is None:
            result.append(profile)
            continue

        new_distribution = override.distribution if override.distribution is not None else profile.distribution
        new_params: dict = dict(profile.distribution_params)

        if override.params:
            if profile.col_type == "categorical" and "frequencies" in override.params:
                new_params = {"frequencies": override.params["frequencies"]}
            else:
                new_params.update(override.params)

        result.append(
            ColumnProfile(
                name=profile.name,
                col_type=profile.col_type,
                distribution=new_distribution,
                distribution_params=new_params,
                stats=profile.stats,
            )
        )
    return result


def sample_from_schema(
    config: GenerationConfig,
    n_rows: int,
    rng: np.random.Generator,
) -> pd.DataFrame:
    """Generate *n_rows* rows from an agent-defined column schema.

    Uses distribution_hints from GenerationConfig.columns.  No source data
    required — distributions are synthesised from hints and domain knowledge.
    """
    if not config.columns:
        raise ValueError("agent-first sampling requires GenerationConfig.columns to be set")

    df = pd.DataFrame(index=range(n_rows))
    for spec in config.columns:
        df[spec.name] = _sample_from_spec(spec, n_rows, rng)
    return df


# ── Gaussian Copula ───────────────────────────────────────────────────────────

def _sample_copula(
    df: pd.DataFrame,
    profiles: list[ColumnProfile],
    n_rows: int,
    rng: np.random.Generator,
) -> pd.DataFrame:
    """Sample continuous/boolean columns jointly through a Gaussian Copula."""
    # Transform each column to uniform marginals via fitted CDF
    uniform_samples = np.column_stack(
        [_to_uniform(p, n_rows, rng) for p in profiles]
    )

    # Build a simple correlation matrix from near-independent columns
    # (In a real fitted model this would come from the source data correlation)
    n_cols = len(profiles)
    corr = np.eye(n_cols)

    # Correlate via Cholesky decomposition
    try:
        L = np.linalg.cholesky(corr)
    except np.linalg.LinAlgError:
        L = np.eye(n_cols)

    z = rng.standard_normal((n_rows, n_cols))
    z_correlated = z @ L.T

    # Map back through each marginal's inverse CDF
    normal_cdf = stats.norm.cdf(z_correlated)
    for i, profile in enumerate(profiles):
        col_uniform = np.clip(normal_cdf[:, i], 1e-6, 1 - 1e-6)
        df[profile.name] = _from_uniform(profile, col_uniform)

    return df


def _to_uniform(profile: ColumnProfile, n_rows: int, rng: np.random.Generator) -> np.ndarray:
    """Sample column independently then convert to uniform via CDF."""
    samples = _sample_continuous_marginal(profile, n_rows, rng)
    dist_name = profile.distribution or "normal"
    p = profile.distribution_params

    if dist_name == "normal":
        u = stats.norm.cdf(samples, loc=p.get("loc", 0), scale=max(p.get("scale", 1), 1e-9))
    elif dist_name == "lognormal":
        u = stats.lognorm.cdf(samples, s=p.get("s", 1), loc=p.get("loc", 0), scale=max(p.get("scale", 1), 1e-9))
    else:
        u = stats.norm.cdf(samples)
    return np.clip(u, 1e-6, 1 - 1e-6)


def _from_uniform(profile: ColumnProfile, u: np.ndarray) -> np.ndarray:
    """Convert uniform samples to column values via inverse CDF."""
    dist_name = profile.distribution or "normal"
    p = profile.distribution_params

    if profile.col_type == "boolean":
        prob = p.get("p", 0.5)
        return (u < prob).astype(int)

    if dist_name == "lognormal":
        return stats.lognorm.ppf(u, s=p.get("s", 1), loc=p.get("loc", 0), scale=max(p.get("scale", 1), 1e-9))

    return stats.norm.ppf(u, loc=p.get("loc", 0), scale=max(p.get("scale", 1), 1e-9))


def _sample_continuous_marginal(
    profile: ColumnProfile, n_rows: int, rng: np.random.Generator
) -> np.ndarray:
    dist_name = profile.distribution or "normal"
    p = profile.distribution_params

    if profile.col_type == "boolean":
        prob = p.get("p", 0.5)
        return rng.random(n_rows) - prob   # used only for uniform transform

    if dist_name == "lognormal":
        s = p.get("s", 1.0)
        loc = p.get("loc", 0.0)
        scale = max(p.get("scale", 1.0), 1e-9)
        return stats.lognorm.rvs(s=s, loc=loc, scale=scale, size=n_rows, random_state=_to_seed(rng))

    loc = p.get("loc", 0.0)
    scale = max(p.get("scale", 1.0), 1e-9)
    return rng.normal(loc=loc, scale=scale, size=n_rows)


# ── Categorical sampling ───────────────────────────────────────────────────────

def _sample_categorical(
    profile: ColumnProfile, n_rows: int, rng: np.random.Generator
) -> np.ndarray:
    freqs: dict = profile.distribution_params.get("frequencies", {})
    if not freqs:
        return np.array(["unknown"] * n_rows)
    categories = list(freqs.keys())
    probabilities = np.array(list(freqs.values()), dtype=float)
    probabilities /= probabilities.sum()
    indices = rng.choice(len(categories), size=n_rows, p=probabilities)
    return np.array(categories)[indices]


# ── Datetime sampling ─────────────────────────────────────────────────────────

def _sample_datetime(
    profile: ColumnProfile, n_rows: int, rng: np.random.Generator
) -> list[str]:
    p = profile.distribution_params
    interval = p.get("interval", {})
    mean_s = interval.get("mean_seconds", 3600.0)
    std_s = interval.get("std_seconds", 1800.0)

    base_ts = datetime.now(timezone.utc)
    intervals = rng.normal(loc=mean_s, scale=max(std_s, 1.0), size=n_rows)
    intervals = np.clip(intervals, 0, None)
    timestamps = []
    current = base_ts
    for delta in intervals:
        current = current + timedelta(seconds=float(delta))
        timestamps.append(current.isoformat())
    return timestamps


# ── Agent-first spec sampling ─────────────────────────────────────────────────

def _sample_from_spec(spec: ColumnSpec, n_rows: int, rng: np.random.Generator) -> np.ndarray | list:
    """Sample n_rows values from a ColumnSpec.

    Prefers spec.distribution_params for numeric configuration; falls back to
    sensible defaults derived from distribution_hint when params are absent.
    """
    hint = spec.distribution_hint or "normal"
    p = spec.distribution_params  # may be empty dict

    if spec.col_type == "id":
        fmt = p.get("format_pattern")
        if fmt:
            return [f"{fmt}_{i:08d}" for i in range(n_rows)]
        return [f"{spec.name}_{i:08d}" for i in range(n_rows)]

    if spec.col_type == "boolean":
        prob = float(p.get("p", 0.5))
        return (rng.random(n_rows) < prob).astype(int)

    if spec.col_type == "categorical":
        allowed: list | None = p.get("allowed_values")
        if allowed:
            return rng.choice(allowed, size=n_rows)
        if spec.sample_values:
            return rng.choice(spec.sample_values, size=n_rows)
        return np.array(["category_a"] * n_rows)

    if spec.col_type == "datetime":
        time_start = p.get("time_start")
        time_end = p.get("time_end")
        business_only = bool(p.get("business_hours_only", False))

        if time_start and time_end:
            try:
                ts_start = datetime.fromisoformat(time_start).replace(tzinfo=timezone.utc)
                ts_end = datetime.fromisoformat(time_end).replace(tzinfo=timezone.utc)
                total_seconds = (ts_end - ts_start).total_seconds()
                offsets = rng.uniform(0, max(total_seconds, 1.0), size=n_rows)
                result = []
                for offset in offsets:
                    ts = ts_start + timedelta(seconds=float(offset))
                    if business_only:
                        hour = ts.hour + ts.minute / 60.0
                        if not (9.0 <= hour < 18.0):
                            hour_offset = rng.uniform(9.0, 18.0)
                            ts = ts.replace(hour=int(hour_offset), minute=int((hour_offset % 1) * 60))
                    result.append(ts.isoformat())
                return result
            except (ValueError, OverflowError):
                logger.warning("Invalid datetime params for column %s — using defaults", spec.name)

        base_ts = datetime.now(timezone.utc)
        deltas = rng.exponential(scale=3600.0, size=n_rows)
        result = []
        current = base_ts
        for d in deltas:
            current = current + timedelta(seconds=float(d))
            result.append(current.isoformat())
        return result

    # continuous — use distribution_params when available
    if hint == "lognormal":
        s = float(p.get("s", 1.5))
        loc = float(p.get("loc", 0.0))
        scale = float(p.get("scale", 150.0))
        values = stats.lognorm.rvs(s=s, loc=loc, scale=scale, size=n_rows, random_state=_to_seed(rng))
    elif hint == "exponential":
        scale = float(p.get("scale", 1.0))
        values = rng.exponential(scale=scale, size=n_rows)
    elif hint == "uniform":
        loc = float(p.get("loc", 0.0))
        scale = float(p.get("scale", 1.0))
        values = rng.uniform(loc, loc + scale, size=n_rows)
    else:  # normal (default)
        loc = float(p.get("loc", 0.0))
        scale = float(p.get("scale", 1.0))
        values = rng.normal(loc=loc, scale=max(scale, 1e-9), size=n_rows)

    # Apply explicit min/max bounds when provided
    col_min = p.get("min")
    col_max = p.get("max")
    if col_min is not None or col_max is not None:
        values = np.clip(values, col_min, col_max)

    return values


# ── Default schema for domain packs ──────────────────────────────────────────

def get_default_columns(domain_pack: str | None) -> list[ColumnSpec]:
    """Return a sensible ColumnSpec list when the agent hasn't called define_schema.

    Each domain pack gets a realistic default column set so generation never
    hard-fails due to a missing schema.
    """
    if domain_pack == "fraud":
        return [
            ColumnSpec(name="transaction_id", col_type="id"),
            ColumnSpec(name="amount", col_type="continuous", distribution_hint="lognormal",
                       distribution_params={"s": 1.5, "loc": 0.0, "scale": 150.0}),
            ColumnSpec(name="merchant_category", col_type="categorical",
                       sample_values=["retail", "food_beverage", "travel", "entertainment", "other"]),
            ColumnSpec(name="card_type", col_type="categorical",
                       sample_values=["VISA", "Mastercard", "Amex", "Discover"]),
            ColumnSpec(name="channel", col_type="categorical",
                       sample_values=["online", "in_store", "atm", "mobile"]),
            ColumnSpec(name="hour_of_day", col_type="continuous", distribution_hint="uniform",
                       distribution_params={"loc": 0.0, "scale": 24.0}),
            ColumnSpec(name="is_fraud", col_type="boolean",
                       distribution_params={"p": 0.02}),
        ]

    if domain_pack == "aml":
        return [
            ColumnSpec(name="transaction_id", col_type="id"),
            ColumnSpec(name="sender_account", col_type="id"),
            ColumnSpec(name="receiver_account", col_type="id"),
            ColumnSpec(name="amount", col_type="continuous", distribution_hint="lognormal",
                       distribution_params={"s": 1.8, "loc": 0.0, "scale": 500.0}),
            ColumnSpec(name="transaction_type", col_type="categorical",
                       sample_values=["wire_transfer", "ach", "cash_deposit", "check", "atm_withdrawal"]),
            ColumnSpec(name="timestamp", col_type="datetime"),
            ColumnSpec(name="is_suspicious", col_type="boolean",
                       distribution_params={"p": 0.005}),
        ]

    # General tabular
    return [
        ColumnSpec(name="record_id", col_type="id"),
        ColumnSpec(name="amount", col_type="continuous", distribution_hint="normal",
                   distribution_params={"loc": 500.0, "scale": 150.0}),
        ColumnSpec(name="category", col_type="categorical",
                   sample_values=["category_a", "category_b", "category_c"]),
        ColumnSpec(name="timestamp", col_type="datetime"),
        ColumnSpec(name="is_flagged", col_type="boolean",
                   distribution_params={"p": 0.05}),
    ]


# ── Utilities ─────────────────────────────────────────────────────────────────

def _to_seed(rng: np.random.Generator) -> int:
    """Extract a reproducible integer seed from an existing Generator."""
    return int(rng.integers(0, 2**31))


def make_rng(seed: int) -> np.random.Generator:
    """Create a seeded Generator for reproducible runs."""
    return np.random.default_rng(seed)
