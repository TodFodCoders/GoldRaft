"""MCX Trading Calendar and Tender Window Engine.

Supports multiple trading day policies for partial holidays:
- ANY_SESSION: Day is trading if either morning or evening session is open.
- MORNING_ONLY: Day is trading only if morning session is open.
- BOTH_SESSIONS: Day is trading only if both morning and evening sessions are open.

Default behavior is CONSERVATIVE:
Computes the tender window and adjusted expiry under every policy and gates on
the EARLIEST tender-window start date (and earliest adjusted expiry).
"""

from __future__ import annotations

import csv
import datetime
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

CALENDAR_COVERAGE_START = datetime.date(2025, 1, 1)
CALENDAR_COVERAGE_END = datetime.date(2026, 12, 31)

HOLIDAYS_CSV = Path(__file__).resolve().parent.parent / "config" / "mcx_holidays.csv"


class TradingDayPolicy(str, Enum):
    ANY_SESSION = "ANY_SESSION"
    MORNING_ONLY = "MORNING_ONLY"
    BOTH_SESSIONS = "BOTH_SESSIONS"


class TenderStatus(str, Enum):
    OUTSIDE_TENDER = "OUTSIDE_TENDER"
    IN_TENDER = "IN_TENDER"
    EXPIRED = "EXPIRED"
    UNKNOWN = "UNKNOWN"


class HolidayRecord:
    def __init__(
        self,
        date: datetime.date,
        description: str,
        morning_open: bool,
        evening_open: bool,
        special_note: str,
        source_file: str,
        source_url: str,
        downloaded_on: str,
        verified: bool,
    ):
        self.date = date
        self.description = description
        self.morning_open = morning_open
        self.evening_open = evening_open
        self.special_note = special_note
        self.source_file = source_file
        self.source_url = source_url
        self.downloaded_on = downloaded_on
        self.verified = verified

    @property
    def is_full_holiday(self) -> bool:
        return (not self.morning_open) and (not self.evening_open)

    @property
    def is_partial_holiday(self) -> bool:
        return self.morning_open != self.evening_open


class TradingCalendar:
    def __init__(self, holidays_path: Optional[Path] = None):
        self.holidays_path = holidays_path or HOLIDAYS_CSV
        self.holidays: Dict[datetime.date, HolidayRecord] = {}
        self.load_holidays()

    def load_holidays(self) -> None:
        if not self.holidays_path.exists():
            raise FileNotFoundError(f"Holidays file not found: {self.holidays_path}")

        self.holidays.clear()
        with open(self.holidays_path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                dt = datetime.date.fromisoformat(row["date"])
                rec = HolidayRecord(
                    date=dt,
                    description=row["description"],
                    morning_open=row["morning_open"].lower() == "true",
                    evening_open=row["evening_open"].lower() == "true",
                    special_note=row.get("special_note", ""),
                    source_file=row.get("source_file", ""),
                    source_url=row.get("source_url", ""),
                    downloaded_on=row.get("downloaded_on", ""),
                    verified=row.get("verified", "false").lower() == "true",
                )
                self.holidays[dt] = rec

    def is_covered(self, dt: datetime.date) -> bool:
        return CALENDAR_COVERAGE_START <= dt <= CALENDAR_COVERAGE_END

    def is_trading_day(
        self,
        dt: datetime.date,
        policy: TradingDayPolicy = TradingDayPolicy.ANY_SESSION,
    ) -> bool:
        """Check if date is a trading day under the given policy."""
        # Weekend check: Saturdays (5) and Sundays (6) are non-trading by default
        if dt.weekday() in (5, 6):
            return False

        if dt not in self.holidays:
            return True

        h = self.holidays[dt]
        if policy == TradingDayPolicy.ANY_SESSION:
            return h.morning_open or h.evening_open
        elif policy == TradingDayPolicy.MORNING_ONLY:
            return h.morning_open
        elif policy == TradingDayPolicy.BOTH_SESSIONS:
            return h.morning_open and h.evening_open
        return False

    def previous_trading_day(
        self,
        dt: datetime.date,
        policy: TradingDayPolicy = TradingDayPolicy.ANY_SESSION,
    ) -> datetime.date:
        """Find the previous trading day before or on dt."""
        curr = dt
        while not self.is_trading_day(curr, policy):
            curr -= datetime.timedelta(days=1)
        return curr

    def adjust_expiry_date(
        self,
        contract_symbol: str,
        year: int,
        month: int,
        policy: TradingDayPolicy = TradingDayPolicy.ANY_SESSION,
    ) -> datetime.date:
        """Compute the official or policy-adjusted expiry date for a contract month.
        
        GOLDM expires on 5th of expiry month (or preceding working day).
        GOLDTEN, GOLDGUINEA, GOLDPETAL expire on last calendar day of expiry month
        (or preceding working day).
        """
        symbol = contract_symbol.upper().strip()
        if symbol == "GOLDM":
            target_date = datetime.date(year, month, 5)
        else:
            # Last calendar day of month
            if month == 12:
                next_month_start = datetime.date(year + 1, 1, 1)
            else:
                next_month_start = datetime.date(year, month + 1, 1)
            target_date = next_month_start - datetime.timedelta(days=1)

        # Holiday/weekend adjustment: roll backward to preceding working day
        return self.previous_trading_day(target_date, policy)

    def compute_tender_window(
        self,
        expiry_date: datetime.date,
        policy: TradingDayPolicy = TradingDayPolicy.ANY_SESSION,
    ) -> List[datetime.date]:
        """Compute the 3 trading days up to and including expiry day."""
        days: List[datetime.date] = []
        curr = expiry_date
        while len(days) < 3:
            if not self.is_covered(curr):
                return []
            if self.is_trading_day(curr, policy):
                days.append(curr)
            curr -= datetime.timedelta(days=1)
        days.reverse()
        return days

    def compute_conservative_tender_window(
        self,
        expiry_date: datetime.date,
    ) -> Dict[str, Any]:
        """Compute tender window across all policies and return conservative earliest start."""
        if not self.is_covered(expiry_date):
            return {
                "status": TenderStatus.UNKNOWN,
                "conservative_start": None,
                "conservative_end": None,
                "policy_results": {},
                "governing_policy": None,
            }

        policy_results = {}
        earliest_start: Optional[datetime.date] = None
        governing_policy: Optional[str] = None

        for pol in TradingDayPolicy:
            w = self.compute_tender_window(expiry_date, pol)
            if not w:
                return {
                    "status": TenderStatus.UNKNOWN,
                    "conservative_start": None,
                    "conservative_end": None,
                    "policy_results": {},
                    "governing_policy": None,
                }
            policy_results[pol.value] = {
                "start": w[0].isoformat(),
                "end": w[-1].isoformat(),
                "days": [d.isoformat() for d in w],
            }
            if earliest_start is None or w[0] < earliest_start:
                earliest_start = w[0]
                governing_policy = pol.value

        return {
            "status": "VALID",
            "conservative_start": earliest_start.isoformat() if earliest_start else None,
            "conservative_end": expiry_date.isoformat(),
            "policy_results": policy_results,
            "governing_policy": governing_policy,
        }

    def evaluate_tender_state(
        self,
        as_of_date: datetime.date,
        expiry_date: datetime.date,
    ) -> Dict[str, Any]:
        """Evaluate whether as_of_date is outside, in, or past tender window."""
        if not self.is_covered(as_of_date) or not self.is_covered(expiry_date):
            return {
                "tender_status": TenderStatus.UNKNOWN,
                "is_entry_permitted": False,
                "reason": "Date outside 2025-2026 coverage window",
                "tender_window_start": None,
                "expiry_date": expiry_date.isoformat(),
            }

        if as_of_date > expiry_date:
            return {
                "tender_status": TenderStatus.EXPIRED,
                "is_entry_permitted": False,
                "reason": "Contract already expired",
                "tender_window_start": None,
                "expiry_date": expiry_date.isoformat(),
            }

        res = self.compute_conservative_tender_window(expiry_date)
        if res["status"] != "VALID" or not res["conservative_start"]:
            return {
                "tender_status": TenderStatus.UNKNOWN,
                "is_entry_permitted": False,
                "reason": "Unable to resolve conservative tender window",
                "tender_window_start": None,
                "expiry_date": expiry_date.isoformat(),
            }

        tender_start = datetime.date.fromisoformat(res["conservative_start"])
        if as_of_date >= tender_start:
            return {
                "tender_status": TenderStatus.IN_TENDER,
                "is_entry_permitted": False,
                "reason": f"In compulsory delivery tender window (started {tender_start})",
                "tender_window_start": res["conservative_start"],
                "expiry_date": expiry_date.isoformat(),
                "governing_policy": res["governing_policy"],
            }

        # Count trading days remaining before tender start
        curr = as_of_date + datetime.timedelta(days=1)
        pre_tender_trading_days = 0
        while curr < tender_start:
            if self.is_trading_day(curr, TradingDayPolicy.ANY_SESSION):
                pre_tender_trading_days += 1
            curr += datetime.timedelta(days=1)

        return {
            "tender_status": TenderStatus.OUTSIDE_TENDER,
            "is_entry_permitted": True,
            "pre_tender_trading_days": pre_tender_trading_days,
            "tender_window_start": res["conservative_start"],
            "expiry_date": expiry_date.isoformat(),
            "governing_policy": res["governing_policy"],
        }


# Singleton calendar instance
_default_calendar: Optional[TradingCalendar] = None


def get_calendar() -> TradingCalendar:
    global _default_calendar
    if _default_calendar is None:
        _default_calendar = TradingCalendar()
    return _default_calendar
