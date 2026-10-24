"""Statutory and Brokerage Transaction Friction Model."""

from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, Optional

import yaml

DEFAULT_COSTS_YAML = Path(__file__).resolve().parent.parent / "config" / "costs.yaml"


def load_costs_config(path: Optional[Path] = None) -> Dict[str, Any]:
    p = path or DEFAULT_COSTS_YAML
    with open(p, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


class CostCalculator:
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.config = config or load_costs_config()
        self.rates = self.config.get("rates", {})

    def compute_roundtrip_costs(
        self,
        notional_per_leg: float,
        brokerage_per_order: Optional[float] = None,
    ) -> Dict[str, float]:
        """Compute complete roundtrip transaction friction for a single contract leg.
        
        Args:
            notional_per_leg: Value of the contract leg (e.g., Rs 750,000).
            brokerage_per_order: Optional override for flat brokerage per executed order leg.
                                 If None, loaded from costs.yaml.
        """
        buy_notional = notional_per_leg
        sell_notional = notional_per_leg
        total_turnover = buy_notional + sell_notional

        # Exchange charge (MCX: 0.00210% of turnover)
        mcx_rate = float(self.rates.get("mcx_exchange_charge", {}).get("rate", 0.0000210))
        mcx_charge = round(total_turnover * mcx_rate, 2)

        # SEBI fee (Rs 10 / crore = 0.00010% of turnover)
        sebi_rate = float(self.rates.get("sebi_turnover_fee", {}).get("rate", 0.0000010))
        sebi_fee = round(total_turnover * sebi_rate, 2)

        # CTT (0.01% on sell side only)
        ctt_rate = float(self.rates.get("ctt", {}).get("rate", 0.00010))
        ctt = round(sell_notional * ctt_rate, 2)

        # Stamp duty (0.002% on buy side only)
        stamp_rate = float(self.rates.get("stamp_duty", {}).get("rate", 0.000020))
        stamp_duty = round(buy_notional * stamp_rate, 2)

        # Brokerage (e.g., Rs 20 flat per executed order leg -> 2 legs for roundtrip)
        if brokerage_per_order is not None:
            brokerage_rate = brokerage_per_order
        else:
            brokerage_rate = float(self.rates.get("brokerage", {}).get("rate", 20.0))
        brokerage = round(brokerage_rate * 2.0, 2)

        # GST: 18% on (brokerage + exchange charges + SEBI fee)
        gst_base = brokerage + mcx_charge + sebi_fee
        gst_rate = float(self.rates.get("gst", {}).get("rate", 0.18))
        gst = round(gst_base * gst_rate, 2)

        total_cost = round(mcx_charge + sebi_fee + ctt + stamp_duty + brokerage + gst, 2)

        return {
            "notional_per_leg": notional_per_leg,
            "total_turnover": total_turnover,
            "mcx_charge": mcx_charge,
            "sebi_fee": sebi_fee,
            "ctt": ctt,
            "stamp_duty": stamp_duty,
            "brokerage": brokerage,
            "gst": gst,
            "total_cost": total_cost,
        }
