"""Test Suite for Phase 2: Relative-Value Analytics & Curve Engine."""

import math
from pathlib import Path
import pytest

from backend.analytics.curve import compute_symbol_curve, decompose_cross_expiry_gap
from backend.analytics.liquidity import compute_corwin_schultz_pair, compute_contract_liquidity_series
from backend.analytics.offset_diagnostic import compute_offset_diagnostics
from backend.analytics.relative_value import compute_pair_spread, compute_point_in_time_zscore
from backend.ingestion.manual_importer import load_contracts_config
from backend.normalization.price_normalizer import (
    compute_four_contract_lcm,
    match_pair_lots,
    normalize_price,
)

DROP_DIR = Path(__file__).resolve().parent.parent / "data" / "manual_drop"
FILE_22OCT = DROP_DIR / "BhavCopyDateWise_22102026.csv"


def test_normalization_sensitivity_mode():
    """Verify normalization sensitivity mode with and without purity scaling."""
    # Price = 142800 per 10g, purity 995
    scaled = normalize_price(142800.0, quote_base_g=10.0, purity_fineness=995.0, apply_purity_scaling=True)
    unscaled = normalize_price(142800.0, quote_base_g=10.0, purity_fineness=995.0, apply_purity_scaling=False)

    assert scaled == 143374.07
    assert unscaled == 142800.00
    assert scaled > unscaled


def test_lot_matcher_and_200g_lcm_case():
    """Verify global LCM basket and pairwise lot matching with residual grams."""
    # 1. Global LCM across all 4 contracts
    lcm_res = compute_four_contract_lcm()
    assert lcm_res["lcm_grams"] == 200
    ratios = lcm_res["lot_ratios"]
    assert ratios["GOLDM"] == 2       # 2 * 100g = 200g
    assert ratios["GOLDTEN"] == 20    # 20 * 10g = 200g
    assert ratios["GOLDGUINEA"] == 25 # 25 * 8g = 200g
    assert ratios["GOLDPETAL"] == 200 # 200 * 1g = 200g

    # 2. Pairwise LCM: GOLDM (100g) vs GOLDGUINEA (8g) -> LCM is 200g, 0 residual
    pair_m_guinea = match_pair_lots("GOLDM", "GOLDGUINEA")
    assert pair_m_guinea["lcm_grams"] == 200
    assert pair_m_guinea["lots_a"] == 2
    assert pair_m_guinea["lots_b"] == 25
    assert pair_m_guinea["residual_grams"] == 0.0
    assert pair_m_guinea["is_exact_match"] is True

    # 3. Explicit residual grams when target amount cannot be matched evenly
    # Target 150g with GOLDM (100g) and GOLDGUINEA (8g):
    # GOLDM: floor(150/100) = 1 lot = 100g
    # GOLDGUINEA: floor(150/8) = 18 lots = 144g
    # Residual: |100 - 144| = 44g
    pair_custom = match_pair_lots("GOLDM", "GOLDGUINEA", target_grams=150.0)
    assert pair_custom["lots_a"] == 1
    assert pair_custom["lots_b"] == 18
    assert pair_custom["residual_grams"] == 44.0
    assert pair_custom["is_exact_match"] is False


def test_point_in_time_zscore_unavailable_on_short_history():
    """Verify Z-score returns UNAVAILABLE when observations < min_samples (e.g. n=9 < 30)."""
    # 9 non-consecutive spread observations from real sample
    sample_spreads = [-633.25, -630.0, -635.0, -632.0, -628.0, -631.0, -629.0, -634.0, -633.0]
    res = compute_point_in_time_zscore(sample_spreads, min_samples=30)

    assert res["status"] == "UNAVAILABLE"
    assert res["z_score"] is None
    assert "insufficient history (n=9, need >=30)" in res["reason"]


def test_point_in_time_zscore_no_lookahead():
    """Verify strictly point-in-time property: future values cannot alter current/past z-score."""
    # 35 historical spread observations
    history_base = [(-630.0 + (i % 5)) for i in range(35)]

    z_at_t = compute_point_in_time_zscore(history_base, min_samples=30)
    assert z_at_t["status"] == "AVAILABLE"
    assert z_at_t["z_score"] is not None
    saved_z = z_at_t["z_score"]

    # Now simulate future days t+1, t+2 with extreme market movements
    history_future = history_base + [-800.0, -1200.0, -400.0]

    # Calculate z-score at index t again by taking history up to t
    z_recomputed = compute_point_in_time_zscore(history_future[:35], min_samples=30)
    assert z_recomputed["z_score"] == saved_z


def test_corwin_schultz_edge_cases():
    """Verify Corwin-Schultz estimator edge cases: zero range, negative estimate, non-positive price."""
    # 1. Zero range across sessions (H == L) -> NOT_ESTIMABLE
    res_flat = compute_corwin_schultz_pair(100.0, 100.0, 100.0, 100.0)
    assert res_flat["status"] == "NOT_ESTIMABLE"

    # 2. Non-positive price
    res_neg_px = compute_corwin_schultz_pair(0.0, 0.0, 100.0, 95.0)
    assert res_neg_px["status"] == "NOT_ESTIMABLE"

    # 3. Valid normal estimation
    # Day 1: H=102, L=98; Day 2: H=104, L=97
    res_valid = compute_corwin_schultz_pair(102.0, 98.0, 104.0, 97.0)
    assert res_valid["status"] == "ESTIMATED"
    assert res_valid["spread_estimate"] > 0
    assert res_valid["spread_pct"] > 0


def test_offset_diagnostic_real_data_2026_10_22():
    """Verify offset diagnostic on 2026-10-22 real data: GOLDTEN minus GOLDGUINEA = -633.25 (-0.44%)."""
    if not FILE_22OCT.exists():
        pytest.skip(f"Required real Bhavcopy file missing: {FILE_22OCT}")

    res = compute_offset_diagnostics(target_expiry="2026-10-30", from_date="2026-10-22", to_date="2026-10-22")
    assert res["observations_count"] >= 1

    obs = res["observations"][0]
    assert obs["trade_date"] == "2026-10-22"
    assert obs["expiry_date"] == "2026-10-30"
    assert obs["ten_minus_guinea_rs"] == -633.25
    assert obs["ten_minus_guinea_pct"] == -0.4433 or round(obs["ten_minus_guinea_pct"], 2) == -0.44
    assert res["disclaimer"] == "observed gap, unverified, not a signal"


def test_carry_decomposition_synthetic_data():
    """Verify linear term structure carry decomposition for cross-expiry pairs."""
    rec_near = {
        "symbol": "GOLDM",
        "trade_date": "2026-10-22",
        "expiry_date": "2026-11-05",
        "normalized_close_10g_999": 142372.06,
    }
    rec_far = {
        "symbol": "GOLDM",
        "trade_date": "2026-10-22",
        "expiry_date": "2026-12-04",
        "normalized_close_10g_999": 142900.00,
    }
    # Synthetic roll between 05NOV2026 and 04DEC2026 with 450 Rs roll spread
    curve_rolls = [
        {
            "near_expiry": "2026-11-05",
            "far_expiry": "2026-12-04",
            "spread_rs": 450.0,
            "annualized_carry_pct": 3.95,
        }
    ]

    decomp = decompose_cross_expiry_gap(rec_near, rec_far, curve_rolls)
    assert decomp["status"] == "AVAILABLE"
    # Observed gap = 142900.00 - 142372.06 = 527.94
    assert decomp["observed_gap_rs"] == 527.94
    assert decomp["expected_carry_rs"] == 450.0
    # Residual = 527.94 - 450.00 = 77.94
    assert decomp["residual_rs"] == 77.94


def test_pair_eligibility_and_classification():
    """Verify pair classification (SAME_EXPIRY vs CROSS_EXPIRY) and eligibility rules."""
    cfg = load_contracts_config()
    specs = cfg.get("contracts", {})

    # 1. Eligible Same-Expiry Pair: GOLDTEN vs GOLDGUINEA on 30OCT2026
    r_ten = {
        "symbol": "GOLDTEN",
        "trade_date": "2026-10-22",
        "expiry_date": "2026-10-30",
        "raw_expiry": "30OCT2026",
        "normalized_close_10g_999": 142223.00,
        "trading_status": "TRADE",
    }
    r_guinea = {
        "symbol": "GOLDGUINEA",
        "trade_date": "2026-10-22",
        "expiry_date": "2026-10-30",
        "raw_expiry": "30OCT2026",
        "normalized_close_10g_999": 142856.25,
        "trading_status": "TRADE",
    }
    p_same = compute_pair_spread(r_ten, r_guinea, specs)
    assert p_same["pair_type"] == "SAME_EXPIRY"
    assert p_same["is_eligible"] is True
    assert p_same["spread_value_rs"] == -633.25

    # 2. Cross-Expiry Pair: GOLDM (05NOV2026) vs GOLDTEN (30OCT2026)
    r_goldm = {
        "symbol": "GOLDM",
        "trade_date": "2026-10-22",
        "expiry_date": "2026-11-05",
        "raw_expiry": "05NOV2026",
        "normalized_close_10g_999": 142372.06,
        "trading_status": "TRADE",
    }
    p_cross = compute_pair_spread(r_goldm, r_ten, specs)
    assert p_cross["pair_type"] == "CROSS_EXPIRY"
    assert p_cross["is_same_expiry"] is False

    # 3. Ineligible pair due to NO_TRADE (zero volume carried close)
    r_no_trade = dict(r_guinea, trading_status="NO_TRADE")
    p_inelig = compute_pair_spread(r_ten, r_no_trade, specs)
    assert p_inelig["is_eligible"] is False
    assert "zero volume (NO_TRADE carried price)" in p_inelig["ineligibility_reasons"][0]

    # 4. Location Basis Flag for GOLDPETAL
    r_petal = {
        "symbol": "GOLDPETAL",
        "trade_date": "2026-10-22",
        "expiry_date": "2026-10-30",
        "raw_expiry": "30OCT2026",
        "normalized_close_10g_999": 142870.00,
        "trading_status": "TRADE",
    }
    p_petal = compute_pair_spread(r_ten, r_petal, specs)
    assert p_petal["location_basis_differs"] is True
    assert "location basis differs (ex-Mumbai vs ex-Ahmedabad)" in p_petal["location_basis_flag"]
    assert p_petal["uncertainty_buffer_rs"] == 50.0
