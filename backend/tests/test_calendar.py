"""Unit tests for MCX Trading Calendar, holiday adjustments, and tender windows."""

import datetime
from backend.contract_calendar.calendar import (
    TenderStatus,
    TradingCalendar,
    TradingDayPolicy,
    get_calendar,
)


def test_conservative_tender_window_2026_06_30():
    """Verify conservative tender window calculation for 2026-06-30 expiry.
    
    2026-06-26 is Moharram (morning closed, evening open - partial holiday).
    Under ANY_SESSION: window is {26, 29, 30 June} (start: 2026-06-26).
    Under MORNING_ONLY / BOTH_SESSIONS: window is {25, 29, 30 June} (start: 2026-06-25).
    Conservative start MUST be 2026-06-25.
    """
    cal = get_calendar()
    expiry = datetime.date(2026, 6, 30)

    # Any session
    w_any = cal.compute_tender_window(expiry, TradingDayPolicy.ANY_SESSION)
    assert [d.isoformat() for d in w_any] == ["2026-06-26", "2026-06-29", "2026-06-30"]

    # Morning only
    w_morn = cal.compute_tender_window(expiry, TradingDayPolicy.MORNING_ONLY)
    assert [d.isoformat() for d in w_morn] == ["2026-06-25", "2026-06-29", "2026-06-30"]

    # Conservative evaluation
    res = cal.compute_conservative_tender_window(expiry)
    assert res["status"] == "VALID"
    assert res["conservative_start"] == "2026-06-25"
    assert res["conservative_end"] == "2026-06-30"


def test_partial_holidays_2025_03_31_and_2026_03_31():
    """Verify partial holiday handling on month-end dates."""
    cal = get_calendar()
    # 2025-03-31: Id-Ul-Fitr (morning closed, evening open)
    h2025 = cal.holidays[datetime.date(2025, 3, 31)]
    assert h2025.is_partial_holiday
    assert not h2025.morning_open
    assert h2025.evening_open

    # 2026-03-31: Shri Mahavir Jayanti (morning closed, evening open)
    h2026 = cal.holidays[datetime.date(2026, 3, 31)]
    assert h2026.is_partial_holiday
    assert not h2026.morning_open
    assert h2026.evening_open


def test_partial_holiday_2025_11_05_and_weekend_adjustments():
    """Verify 5th-of-month expiry adjustments for GOLDM."""
    cal = get_calendar()

    # 2025-11-05: Guru Nanak Jayanti (morning closed, evening open)
    h = cal.holidays[datetime.date(2025, 11, 5)]
    assert h.is_partial_holiday

    # Under MORNING_ONLY policy, rolls back to preceding working day (2025-11-04)
    exp_morn = cal.adjust_expiry_date("GOLDM", 2025, 11, TradingDayPolicy.MORNING_ONLY)
    assert exp_morn == datetime.date(2025, 11, 4)

    # 2025-10-05 falls on a Sunday -> rolls back to Friday 2025-10-03
    exp_weekend = cal.adjust_expiry_date("GOLDM", 2025, 10, TradingDayPolicy.ANY_SESSION)
    assert exp_weekend == datetime.date(2025, 10, 3)


def test_outside_coverage_returns_unknown():
    """Verify dates outside 2025-2026 coverage window return TENDER_STATUS=UNKNOWN."""
    cal = get_calendar()
    res = cal.evaluate_tender_state(
        as_of_date=datetime.date(2027, 5, 1),
        expiry_date=datetime.date(2027, 5, 5),
    )
    assert res["tender_status"] == TenderStatus.UNKNOWN
    assert not res["is_entry_permitted"]
