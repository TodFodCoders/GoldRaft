"""Price Normalization Engine for MCX Gold Contracts.

Converts contracts with different quote bases (10g, 8g, 1g) and purities (995, 999)
to a standard ₹ per 10g at 999 purity basis:

    price_10g_999 = (price / quote_base_g) * 10 * (999 / purity)

IMPORTANT SPECIFICATION NOTE:
This normalization represents a pure metal-content comparison basis,
NOT an executable parity or executable spread. Physical delivery differentials,
refining costs, and location basis risks are not priced in.
"""

from typing import Dict, Any


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
