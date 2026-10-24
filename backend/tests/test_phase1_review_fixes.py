"""Tests for Phase 1 review fixes and verification requirements."""

import csv
import datetime
from pathlib import Path
import pytest

from backend.contract_calendar.calendar import get_calendar, TradingDayPolicy
from backend.ingestion.manual_importer import ManualImporter
from backend.normalization.price_normalizer import normalize_record, normalize_price

DROP_DIR = Path(__file__).resolve().parent.parent / "data" / "manual_drop"
FILE_22OCT = DROP_DIR / "BhavCopyDateWise_22102026.csv"
FILE_01OCT = DROP_DIR / "BhavCopyDateWise_01102026.csv"


def test_grams_per_lot_cross_check_and_warning(tmp_path):
    """Verify Volume(In 000's)*1000/Volume(Lots) equals trading_unit_g and wrong unit triggers warning."""
    importer = ManualImporter()

    # Create synthetic file with one correct row and one deliberately mismatching row
    synth_file = tmp_path / "BhavCopyDateWise_15102026.csv"
    with open(synth_file, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow([
            "Date", "Instrument Name", "Symbol", "Expiry Date", "Open", "High", "Low", "Close",
            "Previous Close", "Volume(Lots)", "Volume(In 000's)", "Value(Lacs)", "Open Interest(Lots)"
        ])
        # Row 1: GOLDM 100g unit. 10 lots = 1,000g = 1 (in 000's). Cross-check: 1 * 1000 / 10 = 100g (Match)
        writer.writerow(["15 Oct 2026", "FUTCOM", "GOLDM", "05NOV2026", "141000", "142000", "140500", "141500", "141000", "10", "1.00", "141.5", "100"])
        # Row 2: GOLDTEN 10g unit. 10 lots = 100g = 0.1 (in 000's). But we pass 0.5 (in 000's) -> 500g / 10 = 50g != 10g
        writer.writerow(["15 Oct 2026", "FUTCOM", "GOLDTEN", "30OCT2026", "142000", "142500", "141800", "142200", "142000", "10", "0.50", "142.2", "50"])

    val_res, records = importer.import_single_file(synth_file)
    assert val_res.is_valid
    assert len(records) == 2
    # Row 2 should have produced a warning about grams cross-check mismatch
    mismatch_warnings = [w for w in val_res.warnings if "Grams cross-check mismatch" in w]
    assert len(mismatch_warnings) == 1
    assert "GOLDTEN" in mismatch_warnings[0]
    assert "computed 50.00g vs spec 10.0g" in mismatch_warnings[0]


def test_no_trade_flag_on_zero_volume_2026_10_01():
    """Verify GOLDGUINEA 31MAR2027 on 2026-10-01 has volume 0 and is flagged NO_TRADE."""
    if not FILE_01OCT.exists():
        pytest.skip(f"Required real Bhavcopy file missing: {FILE_01OCT}")

    importer = ManualImporter()
    val_res, records = importer.import_single_file(FILE_01OCT)
    assert val_res.is_valid

    # Locate GOLDGUINEA 31MAR2027
    target = None
    for r in records:
        if r["symbol"] == "GOLDGUINEA" and r["raw_expiry"] == "31MAR2027":
            target = r
            break

    assert target is not None, "GOLDGUINEA 31MAR2027 not found in 2026-10-01 file"
    assert target["volume_lots"] == 0, f"Expected 0 volume, got {target['volume_lots']}"
    assert target["trading_status"] == "NO_TRADE", f"Expected NO_TRADE, got {target['trading_status']}"


def test_futcom_and_exact_stripped_symbol_filtering(tmp_path):
    """Verify option rows (OPTFUT) and separate 1kg GOLD contracts are excluded."""
    importer = ManualImporter()

    synth_file = tmp_path / "BhavCopyDateWise_20102026.csv"
    with open(synth_file, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow([
            "Date", "Instrument Name", "Symbol", "Expiry Date", "Open", "High", "Low", "Close",
            "Previous Close", "Volume(Lots)", "Volume(In 000's)", "Value(Lacs)", "Open Interest(Lots)"
        ])
        # Valid FUTCOM tracked contracts
        writer.writerow(["20 Oct 2026", "FUTCOM", "GOLDM       ", "05NOV2026", "141000", "142000", "140500", "141500", "141000", "10", "1.00", "141.5", "100"])
        writer.writerow(["20 Oct 2026", "FUTCOM", "GOLDTEN     ", "30OCT2026", "142000", "142500", "141800", "142200", "142000", "10", "0.10", "14.2", "50"])
        # Should be excluded: 1kg big GOLD contract
        writer.writerow(["20 Oct 2026", "FUTCOM", "GOLD        ", "05NOV2026", "141000", "142000", "140500", "141500", "141000", "10", "10.0", "1415.0", "100"])
        # Should be excluded: Options
        writer.writerow(["20 Oct 2026", "OPTFUT", "GOLDM       ", "05NOV2026", "1000", "1200", "900", "1100", "1000", "50", "5.0", "5.5", "200"])
        # Should be excluded: Silver
        writer.writerow(["20 Oct 2026", "FUTCOM", "SILVERM     ", "30NOV2026", "95000", "96000", "94500", "95500", "95000", "10", "50.0", "47.5", "100"])

    val_res, records = importer.import_single_file(synth_file)
    assert val_res.is_valid
    assert len(records) == 2, f"Expected exactly 2 records, got {len(records)}"
    symbols = {r["symbol"] for r in records}
    assert symbols == {"GOLDM", "GOLDTEN"}


def test_real_expiry_rule_dates():
    """Verify weekend adjustments for real expiries observed in market data."""
    cal = get_calendar()

    # 1. GOLDM 04DEC2026: 2026-12-05 is Saturday -> rolls back to Friday 2026-12-04
    d_dec = cal.adjust_expiry_date("GOLDM", 2026, 12)
    assert d_dec == datetime.date(2026, 12, 4), f"Expected 2026-12-04, got {d_dec}"

    # 2. GOLDM 04JUN2027: 2027-06-05 is Saturday -> rolls back to Friday 2027-06-04
    d_jun = cal.adjust_expiry_date("GOLDM", 2027, 6)
    assert d_jun == datetime.date(2027, 6, 4), f"Expected 2027-06-04, got {d_jun}"

    # 3. GOLDTEN 29JAN2027: 2027-01-31 is Sunday -> rolls back to Friday 2027-01-29
    d_jan = cal.adjust_expiry_date("GOLDTEN", 2027, 1)
    assert d_jan == datetime.date(2027, 1, 29), f"Expected 2027-01-29, got {d_jan}"

    # 4. GOLDGUINEA 26FEB2027: 2027-02-28 is Sunday -> rolls back to Friday 2027-02-26
    d_feb = cal.adjust_expiry_date("GOLDGUINEA", 2027, 2)
    assert d_feb == datetime.date(2027, 2, 26), f"Expected 2027-02-26, got {d_feb}"

    # 5. GOLDPETAL 30OCT2026: 2026-10-31 is Saturday -> rolls back to Friday 2026-10-30
    d_oct = cal.adjust_expiry_date("GOLDPETAL", 2026, 10)
    assert d_oct == datetime.date(2026, 10, 30), f"Expected 2026-10-30, got {d_oct}"


def test_real_golden_values_and_spread_pct_2026_10_22():
    """Verify exact golden values and spread percentage on 2026-10-22 real data."""
    if not FILE_22OCT.exists():
        pytest.skip(f"Required real Bhavcopy file missing: {FILE_22OCT}")

    importer = ManualImporter()
    val_res, records = importer.import_single_file(FILE_22OCT)
    assert val_res.is_valid

    by_key = {f"{r['symbol']}_{r['raw_expiry']}": r for r in records}

    goldm = by_key["GOLDM_05NOV2026"]
    guinea = by_key["GOLDGUINEA_30OCT2026"]
    petal = by_key["GOLDPETAL_30OCT2026"]
    goldten = by_key["GOLDTEN_30OCT2026"]

    assert goldm["close"] == 141802.0
    assert goldm["normalized_close_10g_999"] == 142372.06

    assert guinea["close"] == 114285.0
    assert guinea["normalized_close_10g_999"] == 142856.25

    assert petal["close"] == 14287.0
    assert petal["normalized_close_10g_999"] == 142870.00

    assert goldten["close"] == 142223.0
    assert goldten["normalized_close_10g_999"] == 142223.00

    spread_rs = round(goldten["normalized_close_10g_999"] - guinea["normalized_close_10g_999"], 2)
    assert spread_rs == -633.25

    # Percentage relative to guinea: -633.25 / 142856.25 = -0.44327% -> -0.44%
    spread_pct = round((spread_rs / guinea["normalized_close_10g_999"]) * 100.0, 2)
    assert spread_pct == -0.44, f"Expected -0.44%, got {spread_pct}%"
