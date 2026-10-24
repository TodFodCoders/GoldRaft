"""Persistent-Offset Diagnostic Engine for Same-Expiry MCX Gold Contracts.

Empirically observes the structural basis differential between same-expiry
GOLDTEN (10g, Ahmedabad), GOLDGUINEA (8g, Ahmedabad), and GOLDPETAL (1g, Mumbai).

CRITICAL DOMAIN NOTE:
This diagnostic is DESCRIPTIVE ONLY and strictly labelled:
"observed gap, unverified, not a signal".
It makes NO claim of statistical arbitrage, edge, or guaranteed convergence.
"""

from __future__ import annotations

import datetime
from typing import Any, Dict, List, Optional
import pandas as pd

from backend.contract_calendar.calendar import get_calendar
from backend.storage.parquet_store import get_parquet_store


def compute_offset_diagnostics(
    target_expiry: Optional[str] = "2026-10-30",
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
) -> Dict[str, Any]:
    """Compute same-expiry relative-value offset diagnostic across available sessions."""
    store = get_parquet_store()
    cal = get_calendar()

    df = store.read_all()
    if df.empty:
        return {
            "target_expiry": target_expiry,
            "observations_count": 0,
            "observations": [],
            "summary": "No market observations loaded",
            "disclaimer": "observed gap, unverified, not a signal",
        }

    # Filter to 999 same-expiry contracts: GOLDTEN, GOLDGUINEA, GOLDPETAL
    df_filtered = df[df["symbol"].isin(["GOLDTEN", "GOLDGUINEA", "GOLDPETAL"])].copy()
    if target_expiry:
        df_filtered = df_filtered[df_filtered["expiry_date"] == target_expiry]
    if from_date:
        df_filtered = df_filtered[df_filtered["trade_date"] >= from_date]
    if to_date:
        df_filtered = df_filtered[df_filtered["trade_date"] <= to_date]

    if df_filtered.empty:
        return {
            "target_expiry": target_expiry,
            "observations_count": 0,
            "observations": [],
            "summary": f"No records found for target expiry {target_expiry}",
            "disclaimer": "observed gap, unverified, not a signal",
        }

    # Group by (trade_date, expiry_date)
    observations: List[Dict[str, Any]] = []

    grouped = df_filtered.groupby(["trade_date", "expiry_date"])
    for (t_date_str, exp_date_str), group in grouped:
        t_date = datetime.date.fromisoformat(t_date_str)
        exp_date = datetime.date.fromisoformat(exp_date_str)

        # Days to expiry
        days_to_expiry = (exp_date - t_date).days

        # Days to tender start (conservative earliest tender start)
        tender_info = cal.compute_conservative_tender_window(exp_date)
        tender_start_str = tender_info.get("conservative_start")
        days_to_tender: Optional[int] = None
        if tender_start_str:
            t_start = datetime.date.fromisoformat(tender_start_str)
            days_to_tender = (t_start - t_date).days

        by_sym = {row["symbol"]: row for _, row in group.iterrows()}

        goldten = by_sym.get("GOLDTEN")
        guinea = by_sym.get("GOLDGUINEA")
        petal = by_sym.get("GOLDPETAL")

        obs_row: Dict[str, Any] = {
            "trade_date": t_date_str,
            "expiry_date": exp_date_str,
            "raw_expiry": group["raw_expiry"].iloc[0] if "raw_expiry" in group else exp_date_str,
            "days_to_expiry": days_to_expiry,
            "days_to_tender_start": days_to_tender,
            "tender_start_date": tender_start_str,
            "tender_status": tender_info.get("status", "UNKNOWN"),
        }

        # Legs info
        for sym, rec in [("goldten", goldten), ("guinea", guinea), ("petal", petal)]:
            if rec is not None:
                obs_row[f"{sym}_close"] = float(rec["close"]) if pd.notna(rec["close"]) else None
                obs_row[f"{sym}_norm_close"] = float(rec["normalized_close_10g_999"]) if pd.notna(rec["normalized_close_10g_999"]) else None
                obs_row[f"{sym}_volume_grams"] = float(rec["volume_grams"]) if pd.notna(rec["volume_grams"]) else 0.0
                obs_row[f"{sym}_value_lacs"] = float(rec["value_lacs"]) if pd.notna(rec["value_lacs"]) else 0.0
                obs_row[f"{sym}_no_trade"] = rec.get("trading_status") == "NO_TRADE"
            else:
                obs_row[f"{sym}_close"] = None
                obs_row[f"{sym}_norm_close"] = None
                obs_row[f"{sym}_volume_grams"] = 0.0
                obs_row[f"{sym}_value_lacs"] = 0.0
                obs_row[f"{sym}_no_trade"] = True

        # Pair Spreads:
        # 1. GOLDTEN minus GOLDGUINEA
        if obs_row["goldten_norm_close"] and obs_row["guinea_norm_close"]:
            gap_rs = round(obs_row["goldten_norm_close"] - obs_row["guinea_norm_close"], 2)
            gap_pct = round((gap_rs / obs_row["guinea_norm_close"]) * 100.0, 4)
            obs_row["ten_minus_guinea_rs"] = gap_rs
            obs_row["ten_minus_guinea_pct"] = gap_pct
        else:
            obs_row["ten_minus_guinea_rs"] = None
            obs_row["ten_minus_guinea_pct"] = None

        # 2. GOLDTEN minus GOLDPETAL
        if obs_row["goldten_norm_close"] and obs_row["petal_norm_close"]:
            gap_rs = round(obs_row["goldten_norm_close"] - obs_row["petal_norm_close"], 2)
            gap_pct = round((gap_rs / obs_row["petal_norm_close"]) * 100.0, 4)
            obs_row["ten_minus_petal_rs"] = gap_rs
            obs_row["ten_minus_petal_pct"] = gap_pct
        else:
            obs_row["ten_minus_petal_rs"] = None
            obs_row["ten_minus_petal_pct"] = None

        # 3. GOLDGUINEA minus GOLDPETAL
        if obs_row["guinea_norm_close"] and obs_row["petal_norm_close"]:
            gap_rs = round(obs_row["guinea_norm_close"] - obs_row["petal_norm_close"], 2)
            gap_pct = round((gap_rs / obs_row["petal_norm_close"]) * 100.0, 4)
            obs_row["guinea_minus_petal_rs"] = gap_rs
            obs_row["guinea_minus_petal_pct"] = gap_pct
        else:
            obs_row["guinea_minus_petal_rs"] = None
            obs_row["guinea_minus_petal_pct"] = None

        observations.append(obs_row)

    observations.sort(key=lambda x: x["trade_date"])

    return {
        "target_expiry": target_expiry,
        "observations_count": len(observations),
        "observations": observations,
        "disclaimer": "observed gap, unverified, not a signal",
        "sample_size_note": f"Descriptive diagnostic based on {len(observations)} observed trading days. Not a continuous time series.",
    }
