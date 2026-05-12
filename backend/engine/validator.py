"""Constraint validation against domain schema.

Every generated row is run through all active constraints.
Failing rows are regenerated up to CONSTRAINT_REGEN_ATTEMPTS times.
Rows that cannot be made valid are excluded and counted as failures —
they are never silently passed.
"""

from __future__ import annotations

import logging
from typing import Any, Callable

import pandas as pd

from backend.constants import CONSTRAINT_REGEN_ATTEMPTS
from backend.models.schemas import Constraint

logger = logging.getLogger(__name__)


# ── Public API ────────────────────────────────────────────────────────────────

def validate_dataframe(
    df: pd.DataFrame,
    constraints: list[Constraint],
    resample_row: Callable[[int], dict[str, Any]],
) -> tuple[pd.DataFrame, int]:
    """Validate every row against *constraints*.

    Rows that fail are regenerated via *resample_row(row_index)* up to
    CONSTRAINT_REGEN_ATTEMPTS times.  Rows still failing after all attempts
    are dropped.

    Returns (validated_df, failure_count).
    """
    if not constraints:
        return df, 0

    validators = [_build_validator(c) for c in constraints]
    rows: list[dict[str, Any]] = df.to_dict(orient="records")
    failure_count = 0
    accepted: list[dict[str, Any]] = []

    for i, row in enumerate(rows):
        row, failed = _validate_row(row, validators)
        if failed:
            row, failed = _regen_row(i, resample_row, validators)
        if failed:
            failure_count += 1
            logger.debug("Row %d excluded after %d regen attempts", i, CONSTRAINT_REGEN_ATTEMPTS)
        else:
            accepted.append(row)

    return pd.DataFrame(accepted), failure_count


def validate_row(row: dict[str, Any], constraints: list[Constraint]) -> bool:
    """Return True if *row* satisfies every constraint."""
    for constraint in constraints:
        validator = _build_validator(constraint)
        if not validator(row):
            return False
    return True


# ── Internal helpers ───────────────────────────────────────────────────────────

def _validate_row(
    row: dict[str, Any],
    validators: list[Callable[[dict[str, Any]], bool]],
) -> tuple[dict[str, Any], bool]:
    for v in validators:
        if not v(row):
            return row, True
    return row, False


def _regen_row(
    index: int,
    resample_row: Callable[[int], dict[str, Any]],
    validators: list[Callable[[dict[str, Any]], bool]],
) -> tuple[dict[str, Any], bool]:
    for _ in range(CONSTRAINT_REGEN_ATTEMPTS):
        row = resample_row(index)
        _, failed = _validate_row(row, validators)
        if not failed:
            return row, False
    return {}, True


# ── Validator factory ──────────────────────────────────────────────────────────

def _build_validator(constraint: Constraint) -> Callable[[dict[str, Any]], bool]:
    rule_type = constraint.rule_type
    if rule_type == "bound":
        return _bound_validator(constraint)
    if rule_type == "conditional":
        return _conditional_validator(constraint)
    if rule_type == "relational":
        return _relational_validator(constraint)
    if rule_type == "temporal":
        return _temporal_validator(constraint)
    logger.warning("Unknown rule_type %r — skipping constraint", rule_type)
    return lambda _row: True


# ── Bound ──────────────────────────────────────────────────────────────────────

def _bound_validator(c: Constraint) -> Callable[[dict[str, Any]], bool]:
    """Enforce min/max bounds on a numeric column."""
    col = c.column
    p = c.params
    lo = p.get("min")
    hi = p.get("max")

    def check(row: dict[str, Any]) -> bool:
        val = row.get(col)
        if val is None:
            return True
        try:
            v = float(val)
        except (TypeError, ValueError):
            return True
        if lo is not None and v < lo:
            return False
        if hi is not None and v > hi:
            return False
        return True

    return check


# ── Conditional ───────────────────────────────────────────────────────────────

def _conditional_validator(c: Constraint) -> Callable[[dict[str, Any]], bool]:
    """IF column equals value THEN apply a sub-constraint to another column."""
    p = c.params
    if_col: str = p.get("if_column", "")
    if_val: Any = p.get("if_value")
    then_col: str = p.get("then_column", "")
    then_min: float | None = p.get("then_min")
    then_max: float | None = p.get("then_max")
    then_equals: Any = p.get("then_equals")
    modulo: int | None = p.get("modulo")
    modulo_result: int = p.get("modulo_result", 0)

    def check(row: dict[str, Any]) -> bool:
        trigger = row.get(if_col)
        if str(trigger) != str(if_val):
            return True   # condition not triggered
        val = row.get(then_col)
        if val is None:
            return True
        if then_equals is not None and str(val) != str(then_equals):
            return False
        try:
            v = float(val)
        except (TypeError, ValueError):
            return True
        if then_min is not None and v < then_min:
            return False
        if then_max is not None and v > then_max:
            return False
        if modulo is not None and int(v) % modulo != modulo_result:
            return False
        return True

    return check


# ── Relational ────────────────────────────────────────────────────────────────

def _relational_validator(c: Constraint) -> Callable[[dict[str, Any]], bool]:
    """Enforce a numeric relationship between two columns (col_a OP col_b)."""
    p = c.params
    cols = c.columns or []
    col_a = cols[0] if len(cols) > 0 else p.get("column_a", "")
    col_b = cols[1] if len(cols) > 1 else p.get("column_b", "")
    operator: str = p.get("operator", "<=")   # <=, >=, <, >, ==

    ops: dict[str, Callable[[float, float], bool]] = {
        "<=": lambda a, b: a <= b,
        ">=": lambda a, b: a >= b,
        "<": lambda a, b: a < b,
        ">": lambda a, b: a > b,
        "==": lambda a, b: a == b,
    }
    op_fn = ops.get(operator, lambda a, b: True)

    def check(row: dict[str, Any]) -> bool:
        va, vb = row.get(col_a), row.get(col_b)
        if va is None or vb is None:
            return True
        try:
            return op_fn(float(va), float(vb))
        except (TypeError, ValueError):
            return True

    return check


# ── Temporal ──────────────────────────────────────────────────────────────────

def _temporal_validator(c: Constraint) -> Callable[[dict[str, Any]], bool]:
    """Validate temporal ordering: col_a must be before col_b."""
    p = c.params
    cols = c.columns or []
    col_a = cols[0] if len(cols) > 0 else p.get("before_column", "")
    col_b = cols[1] if len(cols) > 1 else p.get("after_column", "")

    def check(row: dict[str, Any]) -> bool:
        va, vb = row.get(col_a), row.get(col_b)
        if va is None or vb is None:
            return True
        try:
            ta = pd.Timestamp(va)
            tb = pd.Timestamp(vb)
            return ta <= tb
        except Exception:
            return True

    return check
