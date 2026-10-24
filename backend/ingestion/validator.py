"""Bhavcopy file and row validator with trap detection and quarantine isolation."""

from __future__ import annotations

import csv
import datetime
import hashlib
import re
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

FILENAME_REGEX = re.compile(r"^BhavCopyDateWise_(\d{8})(?:_\d+)?\.csv$", re.IGNORECASE)

TRACKED_SYMBOLS = {"GOLDM", "GOLDTEN", "GOLDGUINEA", "GOLDPETAL"}


def parse_filename_requested_date(filename: str) -> Optional[datetime.date]:
    """Extract requested date (DDMMYYYY) from filename.
    
    Supports optional '_1' suffix (e.g. BhavCopyDateWise_09062026_1.csv).
    """
    m = FILENAME_REGEX.match(filename)
    if not m:
        return None
    d_str = m.group(1)
    day = int(d_str[0:2])
    month = int(d_str[2:4])
    year = int(d_str[4:8])
    return datetime.date(year, month, day)


def compute_file_sha256(filepath: Path) -> str:
    """Compute sha256 of file bytes."""
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()


def inspect_file_header_and_date(filepath: Path) -> Tuple[Optional[datetime.date], List[str]]:
    """Quickly read first content row to find content date."""
    with open(filepath, "r", encoding="utf-8-sig", errors="replace") as f:
        reader = csv.reader(f)
        try:
            header = next(reader)
        except StopIteration:
            return None, []

        date_col_idx = 0
        for i, col in enumerate(header):
            if col.strip().lower() == "date":
                date_col_idx = i
                break

        for row in reader:
            if row and len(row) > date_col_idx:
                raw_date = row[date_col_idx].strip()
                try:
                    # Content date is formatted as 'DD Mon YYYY' (e.g. '22 Oct 2026')
                    content_date = datetime.datetime.strptime(raw_date, "%d %b %Y").date()
                    return content_date, header
                except Exception:
                    pass
    return None, []


class ValidationResult:
    def __init__(
        self,
        filepath: Path,
        filename: str,
        requested_date: Optional[datetime.date],
        content_date: Optional[datetime.date],
        sha256_hash: str,
        is_valid: bool,
        quarantine_reason: Optional[str] = None,
        rows_accepted: int = 0,
        warnings: Optional[List[str]] = None,
        is_already_imported: bool = False,
    ):
        self.filepath = filepath
        self.filename = filename
        self.requested_date = requested_date
        self.content_date = content_date
        self.sha256_hash = sha256_hash
        self.is_valid = is_valid
        self.quarantine_reason = quarantine_reason
        self.rows_accepted = rows_accepted
        self.warnings = warnings or []
        self.is_already_imported = is_already_imported

    def to_dict(self) -> Dict[str, Any]:
        if self.is_already_imported:
            status = "ALREADY_IMPORTED"
            reason = "ALREADY_STORED"
        elif self.is_valid:
            status = "ACCEPTED"
            reason = "VALID"
        else:
            status = "QUARANTINED"
            reason = self.quarantine_reason or "FAILED"

        return {
            "filename": self.filename,
            "requested_date": self.requested_date.isoformat() if self.requested_date else None,
            "content_date": self.content_date.isoformat() if self.content_date else None,
            "sha256_prefix": self.sha256_hash[:12],
            "status": status,
            "reason": reason,
            "rows_accepted": self.rows_accepted,
            "warnings_count": len(self.warnings),
        }
