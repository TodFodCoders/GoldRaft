"""Unit and golden tests for contract price normalization."""

from pathlib import Path
import pytest

from backend.normalization.price_normalizer import normalize_price
from backend.ingestion.manual_importer import ManualImporter

DROP_DIR = Path(__file__).resolve().parent.parent / "data" / "manual_drop"
FILE_22OCT = DROP_DIR / "BhavCopyDateWise_22102026.csv"


def test_worked_normalization_examples():
    """Verify specific mathematical examples specified in requirements."""
    # 142800 at 995 per 10g -> 143374.07 (NOT 143374.87)
    res_1 = normalize_price(price=142800.0, quote_base_g=10.0, purity_fineness=995.0, apply_purity_scaling=True)
    assert res_1 == 143374.07, f"Expected 143374.07, got {res_1}"

    # 100000 at 995 per 10g -> 100402.01
    res_2 = normalize_price(price=100000.0, quote_base_g=10.0, purity_fineness=995.0, apply_purity_scaling=True)
    assert res_2 == 100402.01, f"Expected 100402.01, got {res_2}"

    # Purity scaling disabled sensitivity check
    res_unscaled = normalize_price(price=142800.0, quote_base_g=10.0, purity_fineness=995.0, apply_purity_scaling=False)
    assert res_unscaled == 142800.00


def test_golden_real_data_2026_10_22():
    """Golden tests from real MCX Bhavcopy file for 2026-10-22."""
    if not FILE_22OCT.exists():
        pytest.skip(f"Required real Bhavcopy file missing: {FILE_22OCT}")

    importer = ManualImporter()
    val_res, records = importer.import_single_file(FILE_22OCT)

    assert val_res.is_valid, f"Validation failed: {val_res.quarantine_reason}"
    assert len(records) > 0, "No records extracted from 22 Oct 2026 file"

    # Index by (symbol, expiry_date)
    contracts = {f"{r['symbol']}_{r['raw_expiry']}": r for r in records}

    # 1. GOLDM 05NOV2026 close 141802 -> 142372.06
    goldm = contracts.get("GOLDM_05NOV2026")
    assert goldm is not None, "GOLDM_05NOV2026 missing from 22 Oct file"
    assert goldm["close"] == 141802.0
    assert goldm["normalized_close_10g_999"] == 142372.06

    # 2. GOLDGUINEA 30OCT2026 close 114285 per 8g -> 142856.25
    guinea = contracts.get("GOLDGUINEA_30OCT2026")
    assert guinea is not None, "GOLDGUINEA_30OCT2026 missing from 22 Oct file"
    assert guinea["close"] == 114285.0
    assert guinea["normalized_close_10g_999"] == 142856.25

    # 3. GOLDPETAL 30OCT2026 close 14287 per 1g -> 142870.00
    petal = contracts.get("GOLDPETAL_30OCT2026")
    assert petal is not None, "GOLDPETAL_30OCT2026 missing from 22 Oct file"
    assert petal["close"] == 14287.0
    assert petal["normalized_close_10g_999"] == 142870.00

    # 4. GOLDTEN 30OCT2026 close 142223 per 10g -> 142223.00
    goldten = contracts.get("GOLDTEN_30OCT2026")
    assert goldten is not None, "GOLDTEN_30OCT2026 missing from 22 Oct file"
    assert goldten["close"] == 142223.0
    assert goldten["normalized_close_10g_999"] == 142223.00

    # 5. Same-expiry GOLDTEN minus GOLDGUINEA = -633.25
    spread = round(goldten["normalized_close_10g_999"] - guinea["normalized_close_10g_999"], 2)
    assert spread == -633.25, f"Expected spread -633.25, got {spread}"
