"""Price Normalization and Lot Matching Engine for MCX Gold Contracts.

Converts contracts with different quote bases (10g, 8g, 1g) and purities (995, 999)
to a standard ₹ per 10g at 999 purity basis:

    price_10g_999 = (price / quote_base_g) * 10 * (999 / purity)

IMPORTANT SPECIFICATION NOTE:
This normalization represents a pure metal-content comparison basis,
NOT an executable parity or executable spread. Physical delivery differentials,
refining costs, and location basis risks are not priced in.
"""

from __future__ import annotations

import math
from typing import Any, Dict, List, Optional


def normalize_price(
    price: float,
    quote_base_g: float,
    purity_fineness: float,
    apply_purity_scaling: bool = True,
) -> float:
    """Normalize a contract price to ₹ per 10 g at 999 purity basis.
    
    Args:
        price: Raw observed price from Bhavcopy.
        quote_base_g: Grams for which the raw price is quoted (e.g., 10, 8, 1).
        purity_fineness: Contract purity (e.g., 995 or 999).
        apply_purity_scaling: If True, scales by (999 / purity_fineness).
                              If False, scales only by quote_base without purity adjustment.
                              
    Returns:
        Normalized price in ₹ per 10g at 999 purity rounded to 2 decimal places.
    """
    if quote_base_g <= 0:
        raise ValueError(f"quote_base_g must be positive, got {quote_base_g}")
    if purity_fineness <= 0:
        raise ValueError(f"purity_fineness must be positive, got {purity_fineness}")

    purity_multiplier = (999.0 / purity_fineness) if apply_purity_scaling else 1.0
    normalized = (price / quote_base_g) * 10.0 * purity_multiplier
    return round(normalized, 2)


def normalize_record(
    record: Dict[str, Any],
    contract_specs: Dict[str, Any],
    apply_purity_scaling: bool = True,
) -> Dict[str, Any]:
    """Normalize a parsed Bhavcopy row record and attach value tags."""
    symbol = record["symbol"].strip().upper()
    spec = contract_specs.get(symbol)
    if not spec:
        raise ValueError(f"Contract symbol {symbol} not found in contract specs")

    quote_base_g = float(spec["quote_base_g"])
    purity = float(spec["purity_fineness"])

    rec = dict(record)
    close_price = record.get("close")

    if close_price is not None and close_price > 0:
        rec["normalized_close_10g_999"] = normalize_price(
            close_price,
            quote_base_g=quote_base_g,
            purity_fineness=purity,
            apply_purity_scaling=apply_purity_scaling,
        )
        rec["normalization_tag"] = "DERIVED"
        rec["normalization_basis"] = "Rs_per_10g_at_999_purity"
        rec["normalization_disclaimer"] = "Metal-content comparison basis, NOT executable parity"
    else:
        rec["normalized_close_10g_999"] = None
        rec["normalization_tag"] = "UNAVAILABLE"

    return rec


STANDARD_TRADING_UNITS = {
    "GOLDM": 100,
    "GOLDTEN": 10,
    "GOLDGUINEA": 8,
    "GOLDPETAL": 1,
}


def compute_four_contract_lcm() -> Dict[str, Any]:
    """Compute global Least Common Multiple (LCM) across all 4 MCX gold contracts.
    
    100g (GOLDM), 10g (GOLDTEN), 8g (GOLDGUINEA), 1g (GOLDPETAL)
    LCM(100, 10, 8, 1) = 200 grams:
      200g = 2 GOLDM = 20 GOLDTEN = 25 GOLDGUINEA = 200 GOLDPETAL.
    """
    lcm_grams = 200
    ratios = {
        sym: lcm_grams // unit for sym, unit in STANDARD_TRADING_UNITS.items()
    }
    return {
        "lcm_grams": lcm_grams,
        "lot_ratios": ratios,
        "description": "200 g = 2 GOLDM = 20 GOLDTEN = 25 GOLDGUINEA = 200 GOLDPETAL",
    }


def match_pair_lots(
    symbol_a: str,
    symbol_b: str,
    target_grams: Optional[float] = None,
) -> Dict[str, Any]:
    """Compute gram-neutral lot ratio and explicit residual grams for any pair.
    
    If target_grams is None, uses the exact LCM between the two contract trading units.
    """
    unit_a = STANDARD_TRADING_UNITS.get(symbol_a.upper())
    unit_b = STANDARD_TRADING_UNITS.get(symbol_b.upper())

    if not unit_a or not unit_b:
        raise ValueError(f"Unknown contract symbol in pair: {symbol_a}, {symbol_b}")

    lcm_pair = (unit_a * unit_b) // math.gcd(unit_a, unit_b)

    if target_grams is None:
        target = float(lcm_pair)
        lots_a = target // unit_a
        lots_b = target // unit_b
        grams_a = lots_a * unit_a
        grams_b = lots_b * unit_b
        residual_grams = abs(grams_a - grams_b)
    else:
        target = float(target_grams)
        lots_a = math.floor(target / unit_a)
        lots_b = math.floor(target / unit_b)
        grams_a = lots_a * unit_a
        grams_b = lots_b * unit_b
        residual_grams = abs(grams_a - grams_b)

    return {
        "symbol_a": symbol_a.upper(),
        "symbol_b": symbol_b.upper(),
        "unit_a_g": unit_a,
        "unit_b_g": unit_b,
        "target_grams": target,
        "lots_a": int(lots_a),
        "lots_b": int(lots_b),
        "grams_a": float(grams_a),
        "grams_b": float(grams_b),
        "residual_grams": float(residual_grams),
        "is_exact_match": residual_grams == 0.0,
        "lcm_grams": lcm_pair,
    }
