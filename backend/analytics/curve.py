"""Futures Term Structure and Implied Calendar Carry Engine.

For each trade date and contract symbol:
- Constructs the term structure curve across up to 6 listed expiries
- Computes annualized implied carry between adjacent expiries:
      annualized_carry = ((P_far / P_near) - 1) * (365 / calendar_days_between)
- For cross-expiry pairs, decomposes the observed gap into:
      Observed Gap = Expected Calendar Carry + Basis Residual
"""

from __future__ import annotations

import datetime
from typing import Any, Dict, List, Optional
import pandas as pd

from backend.storage.parquet_store import get_parquet_store


def compute_symbol_curve(
    trade_date: str,
    symbol: str,
) -> Dict[str, Any]:
    """Build term structure curve and adjacent roll carry for a single symbol on a trade date."""
    store = get_parquet_store()
    df = store.query(symbol=symbol, from_date=trade_date, to_date=trade_date)

    if not df:
        return {
            "trade_date": trade_date,
            "symbol": symbol,
            "expiries_count": 0,
            "points": [],
            "rolls": [],
        }

    # Sort points by expiry_date
    points = sorted(df, key=lambda x: x["expiry_date"])
    points = points[:6]  # up to 6 listed expiries

    rolls: List[Dict[str, Any]] = []

    for i in range(len(points) - 1):
        near = points[i]
        far = points[i + 1]

        p_near = near.get("normalized_close_10g_999") or near.get("close")
        p_far = far.get("normalized_close_10g_999") or far.get("close")

        d_near = datetime.date.fromisoformat(near["expiry_date"])
        d_far = datetime.date.fromisoformat(far["expiry_date"])
        cal_days = (d_far - d_near).days

        if p_near and p_far and p_near > 0 and cal_days > 0:
            raw_roll_pct = (p_far / p_near) - 1.0
            annualized_carry = round(raw_roll_pct * (365.0 / cal_days) * 100.0, 4)
            roll_rs = round(p_far - p_near, 2)
        else:
            annualized_carry = None
            roll_rs = None

        rolls.append({
            "near_expiry": near["expiry_date"],
            "raw_near_expiry": near.get("raw_expiry"),
            "far_expiry": far["expiry_date"],
            "raw_far_expiry": far.get("raw_expiry"),
            "calendar_days": cal_days,
            "price_near": p_near,
            "price_far": p_far,
            "spread_rs": roll_rs,
            "annualized_carry_pct": annualized_carry,
            "formula": "((P_far / P_near) - 1) * (365 / calendar_days)",
            "value_class": "DERIVED",
        })

    return {
        "trade_date": trade_date,
        "symbol": symbol,
        "expiries_count": len(points),
        "points": points,
        "rolls": rolls,
    }


def decompose_cross_expiry_gap(
    record_near: Dict[str, Any],
    record_far: Dict[str, Any],
    same_symbol_curve_rolls: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """Decompose cross-expiry spread into expected calendar-carry and residual.
    
    Formula:
        Observed Gap = P_far - P_near
        Expected Carry = Sum of adjacent roll Rs between near and far expiries (or curve interpolation)
        Residual Basis = Observed Gap - Expected Carry
    """
    p_near = record_near.get("normalized_close_10g_999")
    p_far = record_far.get("normalized_close_10g_999")

    if not p_near or not p_far:
        return {
            "status": "UNAVAILABLE",
            "reason": "Normalized prices missing for one or both legs",
        }

    observed_gap_rs = round(p_far - p_near, 2)

    # Calculate expected carry from roll curve if available
    d_near = datetime.date.fromisoformat(record_near["expiry_date"])
    d_far = datetime.date.fromisoformat(record_far["expiry_date"])
    days_between = (d_far - d_near).days

    if days_between <= 0:
        return {
            "status": "INVALID_EXPIRIES",
            "reason": "Far expiry must be strictly after near expiry",
        }

    # Sum matching rolls in interval
    accum_carry_rs = 0.0
    found_rolls = 0
    for r in same_symbol_curve_rolls:
        r_near = datetime.date.fromisoformat(r["near_expiry"])
        r_far = datetime.date.fromisoformat(r["far_expiry"])
        if r_near >= d_near and r_far <= d_far and r["spread_rs"] is not None:
            accum_carry_rs += r["spread_rs"]
            found_rolls += 1

    expected_carry_rs = round(accum_carry_rs, 2)
    residual_rs = round(observed_gap_rs - expected_carry_rs, 2)

    return {
        "status": "AVAILABLE",
        "observed_gap_rs": observed_gap_rs,
        "expected_carry_rs": expected_carry_rs,
        "residual_rs": residual_rs,
        "days_between": days_between,
        "rolls_aggregated_count": found_rolls,
        "method": "Curve-slope roll aggregation (linear carry attribution)",
        "limitations": "Assumes linear term structure carry without convexity adjustments or financing jump risk",
        "value_class": "DERIVED",
    }
