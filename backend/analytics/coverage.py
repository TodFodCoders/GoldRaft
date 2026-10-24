"""Data Quality and Trading Calendar Coverage Analyzer."""

from __future__ import annotations

import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Set

from backend.contract_calendar.calendar import (
    CALENDAR_COVERAGE_END,
    CALENDAR_COVERAGE_START,
    TradingDayPolicy,
    get_calendar,
)
from backend.ingestion.manual_importer import ManualImporter
from backend.storage.parquet_store import get_parquet_store


def compute_coverage(
    from_date_str: Optional[str] = "2025-01-01",
    to_date_str: Optional[str] = None,
) -> Dict[str, Any]:
    """Compute trading calendar coverage and missing file dates."""
    cal = get_calendar()
    store = get_parquet_store()
    importer = ManualImporter()

    stored_dates = store.get_stored_dates()
    accepted_dates_set = {datetime.date.fromisoformat(d) for d in stored_dates}

    start_date = (
        datetime.date.fromisoformat(from_date_str)
        if from_date_str
        else CALENDAR_COVERAGE_START
    )

    if to_date_str:
        end_date = datetime.date.fromisoformat(to_date_str)
    elif accepted_dates_set:
        end_date = max(accepted_dates_set)
    else:
        end_date = CALENDAR_COVERAGE_END

    # Clamp to calendar bounds
    start_date = max(start_date, CALENDAR_COVERAGE_START)
    end_date = min(end_date, CALENDAR_COVERAGE_END)

    trading_days_total: List[str] = []
    trading_days_with_file: List[str] = []
    missing_trading_days: List[str] = []

    curr = start_date
    while curr <= end_date:
        if cal.is_trading_day(curr, policy=TradingDayPolicy.ANY_SESSION):
            d_str = curr.isoformat()
            trading_days_total.append(d_str)
            if curr in accepted_dates_set:
                trading_days_with_file.append(d_str)
            else:
                missing_trading_days.append(d_str)
        curr += datetime.timedelta(days=1)

    # Inspect drop directory and quarantine log for traps and duplicates
    mismatched_trap_files: List[Dict[str, Any]] = []
    duplicate_hash_files: List[Dict[str, Any]] = []

    # Check quarantine log
    q_log = importer.load_quarantine_log()
    for q in q_log:
        reason = q.get("quarantine_reason", "")
        if reason == "REQUESTED_DATE_NOT_RETURNED_DATE":
            mismatched_trap_files.append(q)
        elif reason == "DUPLICATE_CONTENT_HASH":
            duplicate_hash_files.append(q)

    # Also scan drop files for duplicate hashes
    if importer.manual_drop_dir.exists():
        seen_hashes: Dict[str, str] = {}
        for f in sorted(importer.manual_drop_dir.glob("*.csv")):
            from backend.ingestion.validator import compute_file_sha256
            h = compute_file_sha256(f)
            if h in seen_hashes:
                duplicate_hash_files.append({
                    "filename": f.name,
                    "first_seen_file": seen_hashes[h],
                    "sha256": h,
                })
            else:
                seen_hashes[h] = f.name

    return {
        "range_from": start_date.isoformat(),
        "range_to": end_date.isoformat(),
        "total_trading_days_in_range": len(trading_days_total),
        "trading_days_with_file_count": len(trading_days_with_file),
        "missing_trading_days_count": len(missing_trading_days),
        "mismatched_date_trap_files_count": len(mismatched_trap_files),
        "duplicate_hash_files_count": len(duplicate_hash_files),
        "trading_days_with_file": trading_days_with_file,
        "missing_trading_days": missing_trading_days,
        "mismatched_trap_files": mismatched_trap_files,
        "duplicate_hash_files": duplicate_hash_files,
        "first_accepted_date": min(accepted_dates_set).isoformat() if accepted_dates_set else None,
        "last_accepted_date": max(accepted_dates_set).isoformat() if accepted_dates_set else None,
    }
