"""Unit tests for the statutory and broker transaction cost model."""

from backend.backtest.cost_model import CostCalculator


def test_worked_cost_example_rs_176_14():
    """Verify exact Rs 176.14 worked roundtrip cost example on Rs 750,000 notional leg."""
    calc = CostCalculator()
    costs = calc.compute_roundtrip_costs(notional_per_leg=750000.0, brokerage_per_order=20.0)

    # Breakdown verification
    assert costs["total_turnover"] == 1500000.0
    assert costs["mcx_charge"] == 31.50, f"Expected MCX 31.50, got {costs['mcx_charge']}"
    assert costs["sebi_fee"] == 1.50, f"Expected SEBI 1.50, got {costs['sebi_fee']}"
    assert costs["ctt"] == 75.00, f"Expected CTT 75.00, got {costs['ctt']}"
    assert costs["stamp_duty"] == 15.00, f"Expected Stamp 15.00, got {costs['stamp_duty']}"
    assert costs["brokerage"] == 40.00, f"Expected Brokerage 40.00, got {costs['brokerage']}"
    assert costs["gst"] == 13.14, f"Expected GST 13.14, got {costs['gst']}"
    assert costs["total_cost"] == 176.14, f"Expected Total 176.14, got {costs['total_cost']}"
