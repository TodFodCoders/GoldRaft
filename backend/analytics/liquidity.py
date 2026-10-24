"""Corwin-Schultz High-Low Daily Liquidity Proxy Engine.

Estimates bid-ask spread proxy from 2 consecutive valid trading days' high and low prices
following Corwin & Schultz (2012):

    beta = [ln(H1 / L1)]^2 + [ln(H2 / L2)]^2
    gamma = [ln(max(H1, H2) / min(L1, L2))]^2
    alpha = (sqrt(2 * beta) - sqrt(beta)) / (3 - 2 * sqrt(2)) - sqrt(gamma / (3 - 2 * sqrt(2)))
    Spread = 2 * (exp(alpha) - 1) / (1 + exp(alpha))

CRITICAL ESTIMATOR CONVENTIONS:
1. Liquidity PROXY only, never a real executable bid-ask spread.
2. Evaluated strictly on adjacent valid trading days where High >= Low > 0 and volume > 0.
3. If alpha < 0 or Spread < 0: result is "NOT_ESTIMABLE" (NEVER floored to 0),
   and signals trigger the configured conservative fallback cost hurdle.
4. Volumes and open interest reported in GRAMS or Rs Lacs, never in lots.
"""

from __future__ import annotations

import datetime
import math
from typing import Any, Dict, List, Optional
import numpy as np

from backend.contract_calendar.calendar import get_calendar
from backend.storage.parquet_store import get_parquet_store


def compute_corwin_schultz_pair(
    h1: float,
    l1: float,
    h2: float,
    l2: float,
) -> Dict[str, Any]:
    """Calculate Corwin-Schultz 2-day spread estimate.
    
    Returns spread estimate or NOT_ESTIMABLE status if conditions are violated.
    """
    if h1 <= 0 or l1 <= 0 or h2 <= 0 or l2 <= 0:
        return {
            "status": "NOT_ESTIMABLE",
            "spread_estimate": None,
            "reason": "Non-positive high or low price",
        }

    if h1 < l1 or h2 < l2:
        return {
            "status": "NOT_ESTIMABLE",
            "spread_estimate": None,
            "reason": "High price strictly less than Low price",
        }

    # If prices are flat across both days (H == L)
    if h1 == l1 and h2 == l2 and h1 == h2:
        return {
            "status": "NOT_ESTIMABLE",
            "spread_estimate": None,
            "reason": "High equals Low across both sessions (zero range)",
        }

    denom = 3.0 - 2.0 * math.sqrt(2.0)  # ~0.171572875

    beta = (math.log(h1 / l1)) ** 2 + (math.log(h2 / l2)) ** 2
    gamma = (math.log(max(h1, h2) / min(l1, l2))) ** 2

    term1 = (math.sqrt(2.0 * beta) - math.sqrt(beta)) / denom
    term2 = math.sqrt(gamma / denom)
    alpha = term1 - term2

    if alpha < 0:
        return {
            "status": "NOT_ESTIMABLE",
            "spread_estimate": None,
            "alpha": round(alpha, 6),
            "reason": "Negative alpha estimate (proxy not estimable; requires fallback cost)",
        }

    exp_alpha = math.exp(alpha)
    spread = 2.0 * (exp_alpha - 1.0) / (1.0 + exp_alpha)

    if spread < 0:
        return {
            "status": "NOT_ESTIMABLE",
            "spread_estimate": None,
            "alpha": round(alpha, 6),
            "reason": "Negative spread estimate (proxy not estimable; requires fallback cost)",
        }

    return {
        "status": "ESTIMATED",
        "spread_estimate": round(spread, 6),
        "spread_pct": round(spread * 100.0, 4),
        "alpha": round(alpha, 6),
        "beta": round(beta, 6),
        "gamma": round(gamma, 6),
        "value_class": "DERIVED",
    }


def compute_contract_liquidity_series(
    symbol: str,
    expiry_date: str,
) -> Dict[str, Any]:
    """Compute Corwin-Schultz liquidity proxy across adjacent trading days for a specific contract."""
    store = get_parquet_store()
    cal = get_calendar()

    records = store.query(symbol=symbol, expiry=expiry_date)
    if not records or len(records) < 2:
        return {
            "symbol": symbol,
            "expiry_date": expiry_date,
            "observations_count": len(records),
            "status": "INSUFFICIENT_DATA",
            "reason": "Need at least 2 observations to compute Corwin-Schultz estimator",
            "records": [],
        }

    records.sort(key=lambda x: x["trade_date"])

    results: List[Dict[str, Any]] = []

    for i in range(1, len(records)):
        d_prev = datetime.date.fromisoformat(records[i - 1]["trade_date"])
        d_curr = datetime.date.fromisoformat(records[i]["trade_date"])

        rec_prev = records[i - 1]
        rec_curr = records[i]

        vol_prev = rec_prev.get("volume_lots", 0)
        vol_curr = rec_curr.get("volume_lots", 0)
        status_prev = rec_prev.get("trading_status", "TRADE")
        status_curr = rec_curr.get("trading_status", "TRADE")

        # Trading unit
        unit_g = rec_curr.get("trading_unit_g", 1.0)

        # OI in grams
        oi_grams = (rec_curr.get("open_interest_lots") or 0) * unit_g

        # Check adjacency: verify if d_prev was the immediately preceding trading day according to calendar
        expected_prev = cal.previous_trading_day(d_curr - datetime.timedelta(days=1))
        is_adjacent = (d_prev == expected_prev)

        if not is_adjacent:
            results.append({
                "trade_date": d_curr.isoformat(),
                "prev_trade_date": d_prev.isoformat(),
                "is_adjacent": False,
                "cs_status": "NOT_ESTIMABLE",
                "reason": "Sessions are not adjacent trading days; intervening days missing",
                "spread_estimate": None,
                "volume_grams": rec_curr.get("volume_grams", 0.0),
                "value_lacs": rec_curr.get("value_lacs", 0.0),
                "open_interest_grams": oi_grams,
                "trading_status": status_curr,
            })
            continue

        if status_prev == "NO_TRADE" or status_curr == "NO_TRADE" or vol_prev == 0 or vol_curr == 0:
            results.append({
                "trade_date": d_curr.isoformat(),
                "prev_trade_date": d_prev.isoformat(),
                "is_adjacent": True,
                "cs_status": "NOT_ESTIMABLE",
                "reason": "Zero volume session (NO_TRADE); close is carried price",
                "spread_estimate": None,
                "volume_grams": rec_curr.get("volume_grams", 0.0),
                "value_lacs": rec_curr.get("value_lacs", 0.0),
                "open_interest_grams": oi_grams,
                "trading_status": status_curr,
            })
            continue

        h1 = rec_prev.get("high")
        l1 = rec_prev.get("low")
        h2 = rec_curr.get("high")
        l2 = rec_curr.get("low")

        if not h1 or not l1 or not h2 or not l2:
            results.append({
                "trade_date": d_curr.isoformat(),
                "prev_trade_date": d_prev.isoformat(),
                "is_adjacent": True,
                "cs_status": "NOT_ESTIMABLE",
                "reason": "Missing high or low price observation",
                "spread_estimate": None,
                "volume_grams": rec_curr.get("volume_grams", 0.0),
                "value_lacs": rec_curr.get("value_lacs", 0.0),
                "open_interest_grams": oi_grams,
                "trading_status": status_curr,
            })
            continue

        cs_res = compute_corwin_schultz_pair(h1, l1, h2, l2)
        results.append({
            "trade_date": d_curr.isoformat(),
            "prev_trade_date": d_prev.isoformat(),
            "is_adjacent": True,
            "cs_status": cs_res["status"],
            "spread_estimate": cs_res.get("spread_estimate"),
            "spread_pct": cs_res.get("spread_pct"),
            "reason": cs_res.get("reason"),
            "volume_grams": rec_curr.get("volume_grams", 0.0),
            "value_lacs": rec_curr.get("value_lacs", 0.0),
            "open_interest_grams": oi_grams,
            "trading_status": status_curr,
        })

    return {
        "symbol": symbol,
        "expiry_date": expiry_date,
        "observations_count": len(results),
        "disclaimer": "Corwin-Schultz is a daily OHLC proxy, NOT an executable bid-ask spread",
        "results": results,
    }
