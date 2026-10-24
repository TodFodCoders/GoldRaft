"""Manual Bhavcopy Importer and Quarantine Management Engine."""

from __future__ import annotations

import csv
import datetime
import json
import logging
import re
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

import yaml

from backend.ingestion.validator import (
    FILENAME_REGEX,
    TRACKED_SYMBOLS,
    ValidationResult,
    compute_file_sha256,
    inspect_file_header_and_date,
    parse_filename_requested_date,
)
from backend.normalization.price_normalizer import normalize_record

logger = logging.getLogger(__name__)

DEFAULT_DROP_DIR = Path(__file__).resolve().parent.parent / "data" / "manual_drop"
DEFAULT_QUARANTINE_DIR = Path(__file__).resolve().parent.parent / "data" / "quarantine"
CONTRACTS_YAML = Path(__file__).resolve().parent.parent / "config" / "contracts.yaml"


def load_contracts_config() -> Dict[str, Any]:
    with open(CONTRACTS_YAML, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def parse_compact_expiry(expiry_str: str) -> Optional[datetime.date]:
    """Parse compact expiry date like '30OCT2026' or '05NOV2026'."""
    s = expiry_str.strip().upper()
    try:
        return datetime.datetime.strptime(s, "%d%b%Y").date()
    except Exception:
        return None


def extract_volume_thousands_grams(vol_str: str) -> Optional[float]:
    """Extract numeric value in thousands from volume text like '66.848 GRMS' or '4585.000 GRMS'."""
    if not vol_str:
        return None
    # match float at start
    m = re.match(r"^\s*([0-9.]+)", vol_str)
    if m:
        try:
            return float(m.group(1))
        except ValueError:
            return None
    return None


class ManualImporter:
    def __init__(
        self,
        manual_drop_dir: Optional[Path] = None,
        quarantine_dir: Optional[Path] = None,
        contracts_config: Optional[Dict[str, Any]] = None,
    ):
        self.manual_drop_dir = manual_drop_dir or DEFAULT_DROP_DIR
        self.quarantine_dir = quarantine_dir or DEFAULT_QUARANTINE_DIR
        self.quarantine_dir.mkdir(parents=True, exist_ok=True)
        self.contracts_config = contracts_config or load_contracts_config()
        self.contract_specs = self.contracts_config.get("contracts", {})
        self.quarantine_log_file = self.quarantine_dir / "quarantine_log.json"
        self.processed_hashes: Set[str] = set()
        self.load_quarantine_log()

    def load_quarantine_log(self) -> List[Dict[str, Any]]:
        if self.quarantine_log_file.exists():
            try:
                with open(self.quarantine_log_file, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                return []
        return []

    def save_quarantine_log(self, records: List[Dict[str, Any]]) -> None:
        with open(self.quarantine_log_file, "w", encoding="utf-8") as f:
            json.dump(records, f, indent=2)

    def import_single_file(
        self,
        filepath: Path,
        dedupe_set: Optional[Set[str]] = None,
    ) -> Tuple[ValidationResult, List[Dict[str, Any]]]:
        """Validate, parse, and extract gold records from a single Bhavcopy file."""
        filename = filepath.name
        requested_date = parse_filename_requested_date(filename)
        sha256_hash = compute_file_sha256(filepath)
        warnings: List[str] = []

        if dedupe_set is not None:
            if sha256_hash in dedupe_set:
                return (
                    ValidationResult(
                        filepath=filepath,
                        filename=filename,
                        requested_date=requested_date,
                        content_date=None,
                        sha256_hash=sha256_hash,
                        is_valid=False,
                        quarantine_reason="DUPLICATE_CONTENT_HASH",
                        warnings=["Exact file sha256 content hash already ingested"],
                    ),
                    [],
                )

        content_date, header = inspect_file_header_and_date(filepath)

        # Check Trap: requested_date in filename must match trade_date in content
        if requested_date is not None and content_date is not None:
            if requested_date != content_date:
                return (
                    ValidationResult(
                        filepath=filepath,
                        filename=filename,
                        requested_date=requested_date,
                        content_date=content_date,
                        sha256_hash=sha256_hash,
                        is_valid=False,
                        quarantine_reason="REQUESTED_DATE_NOT_RETURNED_DATE",
                        warnings=[
                            f"Trap detected: Filename requested {requested_date} but content returned {content_date}"
                        ],
                    ),
                    [],
                )

        if content_date is None:
            return (
                ValidationResult(
                    filepath=filepath,
                    filename=filename,
                    requested_date=requested_date,
                    content_date=None,
                    sha256_hash=sha256_hash,
                    is_valid=False,
                    quarantine_reason="NO_VALID_TRADE_DATE_FOUND",
                    warnings=["Could not parse trade date from file header/rows"],
                ),
                [],
            )

        # Parse rows
        records: List[Dict[str, Any]] = []

        with open(filepath, "r", encoding="utf-8-sig", errors="replace") as f:
            reader = csv.reader(f)
            file_header = [c.strip() for c in next(reader, [])]

            col_map = {col: idx for idx, col in enumerate(file_header)}

            req_cols = ["Date", "Instrument Name", "Symbol", "Expiry Date", "Close", "Volume(Lots)"]
            for rc in req_cols:
                if rc not in col_map:
                    return (
                        ValidationResult(
                            filepath=filepath,
                            filename=filename,
                            requested_date=requested_date,
                            content_date=content_date,
                            sha256_hash=sha256_hash,
                            is_valid=False,
                            quarantine_reason=f"MISSING_REQUIRED_COLUMN_{rc}",
                        ),
                        [],
                    )

            date_idx = col_map["Date"]
            inst_idx = col_map["Instrument Name"]
            sym_idx = col_map["Symbol"]
            exp_idx = col_map["Expiry Date"]
            open_idx = col_map.get("Open")
            high_idx = col_map.get("High")
            low_idx = col_map.get("Low")
            close_idx = col_map["Close"]
            prev_close_idx = col_map.get("Previous Close")
            vol_lots_idx = col_map["Volume(Lots)"]
            vol_000_idx = col_map.get("Volume(In 000's)")
            val_lacs_idx = col_map.get("Value(Lacs)")
            oi_lots_idx = col_map.get("Open Interest(Lots)")

            for row_num, row in enumerate(reader, start=2):
                if not row or len(row) <= close_idx:
                    continue

                inst_name = row[inst_idx].strip()
                # STRICT FILTER: only FUTCOM
                if inst_name != "FUTCOM":
                    continue

                symbol = row[sym_idx].strip().upper()
                # STRICT FILTER: exact stripped symbols, never startswith("GOLD")
                if symbol not in TRACKED_SYMBOLS:
                    continue

                raw_exp = row[exp_idx].strip()
                expiry_dt = parse_compact_expiry(raw_exp)
                if not expiry_dt:
                    warnings.append(f"Row {row_num}: Unparseable expiry '{raw_exp}' for {symbol}")
                    continue

                def parse_float(val: str) -> Optional[float]:
                    v = val.strip().replace(",", "")
                    if not v:
                        return None
                    try:
                        return float(v)
                    except ValueError:
                        return None

                def parse_int(val: str) -> int:
                    v = val.strip().replace(",", "")
                    if not v:
                        return 0
                    try:
                        return int(float(v))
                    except ValueError:
                        return 0

                open_px = parse_float(row[open_idx]) if open_idx is not None else None
                high_px = parse_float(row[high_idx]) if high_idx is not None else None
                low_px = parse_float(row[low_idx]) if low_idx is not None else None
                close_px = parse_float(row[close_idx])
                prev_close_px = parse_float(row[prev_close_idx]) if prev_close_idx is not None else None
                vol_lots = parse_int(row[vol_lots_idx])
                val_lacs = parse_float(row[val_lacs_idx]) if val_lacs_idx is not None else 0.0
                oi_lots = parse_int(row[oi_lots_idx]) if oi_lots_idx is not None else 0

                spec = self.contract_specs.get(symbol, {})
                trading_unit_g = float(spec.get("trading_unit_g", 1.0))

                # Volume in thousands & grams cross-check
                vol_in_thousands_str = row[vol_000_idx].strip() if vol_000_idx is not None else ""
                vol_in_thousands_val = extract_volume_thousands_grams(vol_in_thousands_str)

                # Cross-check rule: Volume(In 000's) * 1000 / Volume(Lots) == trading_unit_g
                if vol_lots > 0 and vol_in_thousands_val is not None:
                    computed_g_per_lot = (vol_in_thousands_val * 1000.0) / vol_lots
                    if abs(computed_g_per_lot - trading_unit_g) > 0.01:
                        warnings.append(
                            f"{symbol} {raw_exp} row {row_num}: Grams cross-check mismatch: "
                            f"computed {computed_g_per_lot:.2f}g vs spec {trading_unit_g}g"
                        )

                # Zero volume handling: flag NO_TRADE
                trading_status = "TRADE"
                if vol_lots == 0:
                    trading_status = "NO_TRADE"

                # Bad OHLC check for active volume days
                if vol_lots > 0:
                    if high_px is not None and low_px is not None:
                        if high_px < low_px:
                            warnings.append(
                                f"{symbol} {raw_exp} on {content_date}: High ({high_px}) < Low ({low_px})"
                            )
                        if low_px <= 0:
                            warnings.append(
                                f"{symbol} {raw_exp} on {content_date}: Non-positive Low ({low_px})"
                            )

                # Liquidity in grams and value (never lots)
                liquidity_grams = vol_lots * trading_unit_g
                liquidity_value_lacs = val_lacs if val_lacs is not None else 0.0

                raw_record = {
                    "trade_date": content_date.isoformat(),
                    "symbol": symbol,
                    "expiry_date": expiry_dt.isoformat(),
                    "raw_expiry": raw_exp,
                    "instrument_name": inst_name,
                    "open": open_px,
                    "high": high_px,
                    "low": low_px,
                    "close": close_px,
                    "prev_close": prev_close_px,
                    "volume_lots": vol_lots,
                    "volume_grams": liquidity_grams,
                    "value_lacs": liquidity_value_lacs,
                    "open_interest_lots": oi_lots,
                    "trading_unit_g": trading_unit_g,
                    "trading_status": trading_status,
                    "source_file": filename,
                    "source_sha256": sha256_hash,
                    "source_mode": "MANUAL IMPORT",
                    "value_class": "OBSERVED",
                }

                # Normalize price to Rs per 10g at 999
                norm_record = normalize_record(raw_record, self.contract_specs, apply_purity_scaling=True)
                records.append(norm_record)

        val_result = ValidationResult(
            filepath=filepath,
            filename=filename,
            requested_date=requested_date,
            content_date=content_date,
            sha256_hash=sha256_hash,
            is_valid=True,
            rows_accepted=len(records),
            warnings=warnings,
        )
        return val_result, records

    def import_all(self, directory: Optional[Path] = None) -> Dict[str, Any]:
        """Import all files in the drop directory idempotently."""
        target_dir = directory or self.manual_drop_dir
        if not target_dir.exists():
            return {
                "status": "EMPTY",
                "message": f"Drop directory {target_dir} does not exist",
                "results": [],
                "accepted_count": 0,
                "quarantined_count": 0,
                "total_records": 0,
            }

        files = sorted(
            [f for f in target_dir.iterdir() if f.is_file() and f.name.endswith(".csv")],
            key=lambda x: x.name,
        )

        results: List[ValidationResult] = []
        all_records: List[Dict[str, Any]] = []
        seen_hashes: Set[str] = set()
        quarantine_log = self.load_quarantine_log()

        for filepath in files:
            val_res, records = self.import_single_file(filepath, dedupe_set=seen_hashes)
            results.append(val_res)

            if val_res.is_valid:
                seen_hashes.add(val_res.sha256_hash)
                all_records.extend(records)
            else:
                # Add to quarantine log
                quarantine_entry = {
                    "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                    "filename": val_res.filename,
                    "requested_date": val_res.requested_date.isoformat() if val_res.requested_date else None,
                    "content_date": val_res.content_date.isoformat() if val_res.content_date else None,
                    "sha256": val_res.sha256_hash,
                    "quarantine_reason": val_res.quarantine_reason,
                    "warnings": val_res.warnings,
                }
                quarantine_log.append(quarantine_entry)

        self.save_quarantine_log(quarantine_log)

        accepted_files = [r for r in results if r.is_valid]
        quarantined_files = [r for r in results if not r.is_valid]

        return {
            "status": "COMPLETED",
            "results": [r.to_dict() for r in results],
            "accepted_count": len(accepted_files),
            "quarantined_count": len(quarantined_files),
            "total_records": len(all_records),
            "records": all_records,
        }
