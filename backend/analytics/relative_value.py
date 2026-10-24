"""Relative-Value Analytics Engine for MCX Gold Pairs.

Analyzes relative value between contracts:
- Classifies SAME-EXPIRY vs CROSS-EXPIRY pairs
- Flags location basis risk for GOLDPETAL (ex-Mumbai vs ex-Ahmedabad)
- Checks pair eligibility (both legs traded, no NO_TRADE, master present)
- Computes point-in-time Z-scores with strict look-ahead protection and minimum sample enforcement.
"""

from __future__ import annotations

import datetime
from typing import Any, Dict, List, Optional, Tuple
import pandas as pd
import numpy as np

from backend.normalization.price_normalizer import match_pair_lots
from backend.storage.parquet_store import get_parquet_store

LOCATION_BASIS_WARNING = "location basis differs (ex-Mumbai vs ex-Ahmedabad)"
DEFAULT_MINIMUM_SAMPLE_SIZE = 30
DEFAULT_ROLLING_WINDOW = 30
DEFAULT_UNCERTAINTY_BUFFER_RS = 50.0  # Rs per 10g uncertainty buffer for Mumbai vs Ahmedabad basis


def compute_pair_spread(
    record_a: Dict[str, Any],
    record_b: Dict[str, Any],
    contract_specs: Dict[str, Any],
    uncertainty_buffer: float = DEFAULT_UNCERTAINTY_BUFFER_RS,
) -> Dict[str, Any]:
    """Compute relative-value spread between two contract records on the same trade date."""
    sym_a = record_a["symbol"].strip().upper()
    sym_b = record_b["symbol"].strip().upper()
    trade_date = record_a["trade_date"]
    exp_a = record_a["expiry_date"]
    exp_b = record_b["expiry_date"]
    raw_exp_a = record_a.get("raw_expiry", exp_a)
    raw_exp_b = record_b.get("raw_expiry", exp_b)

    # 1. Eligibility Check
    is_eligible = True
    ineligibility_reasons: List[str] = []

    if trade_date != record_b["trade_date"]:
        is_eligible = False
        ineligibility_reasons.append("Legs belong to different trade dates")

    if sym_a not in contract_specs:
        is_eligible = False
        ineligibility_reasons.append(f"Contract master missing for {sym_a}")
    if sym_b not in contract_specs:
        is_eligible = False
        ineligibility_reasons.append(f"Contract master missing for {sym_b}")

    status_a = record_a.get("trading_status", "TRADE")
    status_b = record_b.get("trading_status", "TRADE")
    if status_a == "NO_TRADE":
        is_eligible = False
        ineligibility_reasons.append(f"Leg A ({sym_a} {raw_exp_a}) has zero volume (NO_TRADE carried price)")
    if status_b == "NO_TRADE":
        is_eligible = False
        ineligibility_reasons.append(f"Leg B ({sym_b} {raw_exp_b}) has zero volume (NO_TRADE carried price)")

    norm_a = record_a.get("normalized_close_10g_999")
    norm_b = record_b.get("normalized_close_10g_999")
    if norm_a is None or norm_b is None:
        is_eligible = False
        ineligibility_reasons.append("Normalized close price missing for one or both legs")

    # 2. Classification: SAME-EXPIRY vs CROSS-EXPIRY
    # Note: Even if month is same, GOLDM expires on 5th while others expire on month-end, which is CROSS-EXPIRY
    is_same_expiry = (exp_a == exp_b)
    pair_type = "SAME_EXPIRY" if is_same_expiry else "CROSS_EXPIRY"

    # 3. Location Basis Check
    has_location_diff = (sym_a == "GOLDPETAL" or sym_b == "GOLDPETAL")
    location_flag = LOCATION_BASIS_WARNING if has_location_diff else None

    # 4. Spread Calculation
    spread_rs: Optional[float] = None
    spread_pct: Optional[float] = None
    if norm_a is not None and norm_b is not None:
        spread_rs = round(norm_a - norm_b, 2)
        spread_pct = round((spread_rs / norm_b) * 100.0, 4)

    # 5. Lot Ratios
    lot_match = match_pair_lots(sym_a, sym_b)

    return {
        "symbol_a": sym_a,
        "symbol_b": sym_b,
        "trade_date": trade_date,
        "expiry_a": exp_a,
        "expiry_b": exp_b,
        "raw_expiry_a": raw_exp_a,
        "raw_expiry_b": raw_exp_b,
        "pair_type": pair_type,
        "is_same_expiry": is_same_expiry,
        "is_eligible": is_eligible,
        "eligibility_status": "ELIGIBLE" if is_eligible else "INELIGIBLE",
        "ineligibility_reasons": ineligibility_reasons,
        "normalized_price_a": norm_a,
        "normalized_price_b": norm_b,
        "spread_value_rs": spread_rs,
        "spread_percentage": spread_pct,
        "location_basis_differs": has_location_diff,
        "location_basis_flag": location_flag,
        "uncertainty_buffer_rs": uncertainty_buffer if has_location_diff else 0.0,
        "lot_matching": lot_match,
        "label": "Observed gap (not a signal)",
        "value_class": "DERIVED",
    }


def compute_point_in_time_zscore(
    history_spreads: List[float],
    min_samples: int = DEFAULT_MINIMUM_SAMPLE_SIZE,
    window: int = DEFAULT_ROLLING_WINDOW,
) -> Dict[str, Any]:
    """Compute strictly point-in-time Z-score using only historical observations up to t-1.
    
    If fewer than min_samples observations exist, returns UNAVAILABLE.
    """
    n = len(history_spreads)
    if n < min_samples:
        return {
            "z_score": None,
            "status": "UNAVAILABLE",
            "reason": f"insufficient history (n={n}, need >={min_samples})",
            "samples_count": n,
            "min_samples_required": min_samples,
        }

    # Use rolling window up to t-1
    sample = history_spreads[-window:]
    mean = float(np.mean(sample))
    std = float(np.std(sample, ddof=1))

    if std <= 1e-6:
        return {
            "z_score": 0.0,
            "status": "ZERO_VARIANCE",
            "mean": round(mean, 2),
            "std": 0.0,
            "samples_count": n,
        }

    current_val = history_spreads[-1]
    # Z-score of today relative to distribution up to t-1
    prior_sample = history_spreads[-(window + 1):-1] if len(history_spreads) > window else history_spreads[:-1]
    if len(prior_sample) < min_samples - 1:
        return {
            "z_score": None,
            "status": "UNAVAILABLE",
            "reason": f"insufficient history (n={len(prior_sample)}, need >={min_samples})",
            "samples_count": len(prior_sample),
            "min_samples_required": min_samples,
        }

    prior_mean = float(np.mean(prior_sample))
    prior_std = float(np.std(prior_sample, ddof=1))
    if prior_std <= 1e-6:
        z = 0.0
    else:
        z = (current_val - prior_mean) / prior_std

    return {
        "z_score": round(float(z), 2),
        "status": "AVAILABLE",
        "prior_mean": round(prior_mean, 2),
        "prior_std": round(prior_std, 2),
        "samples_count": len(prior_sample),
    }
