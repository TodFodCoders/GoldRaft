"""Tests for MCX date trap detection, quarantine isolation, and sha256 deduplication."""

import shutil
import tempfile
from pathlib import Path
import pytest

from backend.ingestion.manual_importer import ManualImporter
from backend.ingestion.validator import parse_filename_requested_date

REAL_DROP_DIR = Path(__file__).resolve().parent.parent / "data" / "manual_drop"
FILE_22OCT = REAL_DROP_DIR / "BhavCopyDateWise_22102026.csv"


def test_filename_parsing_and_suffix():
    """Verify filename regex accepts standard and _1 suffixed names."""
    d1 = parse_filename_requested_date("BhavCopyDateWise_09062026.csv")
    assert d1 is not None
    assert d1.strftime("%Y-%m-%d") == "2026-06-09"

    d2 = parse_filename_requested_date("BhavCopyDateWise_22102026_1.csv")
    assert d2 is not None
    assert d2.strftime("%Y-%m-%d") == "2026-10-22"

    d3 = parse_filename_requested_date("InvalidFile_22102026.csv")
    assert d3 is None


def test_quarantine_mismatched_traps_in_temp_dir():
    """Generate 6 mismatched files in temp dir and assert exactly 6 quarantine records."""
    if not FILE_22OCT.exists():
        pytest.skip(f"Required real Bhavcopy file missing: {FILE_22OCT}")

    with tempfile.TemporaryDirectory() as tmp_dir_str:
        tmp_dir = Path(tmp_dir_str)
        q_dir = tmp_dir / "quarantine"
        drop_dir = tmp_dir / "manual_drop"
        drop_dir.mkdir(parents=True, exist_ok=True)

        # Ensure temp files NEVER touch real manual_drop
        assert drop_dir.resolve() != REAL_DROP_DIR.resolve()

        trap_names = [
            "BhavCopyDateWise_09062026.csv",
            "BhavCopyDateWise_01072026.csv",
            "BhavCopyDateWise_01092026.csv",
            "BhavCopyDateWise_01102026.csv",
            "BhavCopyDateWise_15102026.csv",
            "BhavCopyDateWise_21102026.csv",
        ]

        for name in trap_names:
            dest = drop_dir / name
            shutil.copyfile(FILE_22OCT, dest)

        importer = ManualImporter(manual_drop_dir=drop_dir, quarantine_dir=q_dir)
        res = importer.import_all()

        # All 6 must be quarantined with REQUESTED_DATE_NOT_RETURNED_DATE
        assert res["accepted_count"] == 0, f"Expected 0 accepted, got {res['accepted_count']}"
        assert res["quarantined_count"] == 6, f"Expected 6 quarantined, got {res['quarantined_count']}"

        for item in res["results"]:
            assert not item.get("is_valid", False)
            assert item["reason"] == "REQUESTED_DATE_NOT_RETURNED_DATE"
            assert item["content_date"] == "2026-10-22"

        # Check quarantine log file
        q_log = importer.load_quarantine_log()
        assert len(q_log) == 6
        for entry in q_log:
            assert entry["quarantine_reason"] == "REQUESTED_DATE_NOT_RETURNED_DATE"


def test_sha256_deduplication():
    """Verify that identical content is never ingested twice."""
    if not FILE_22OCT.exists():
        pytest.skip(f"Required real Bhavcopy file missing: {FILE_22OCT}")

    with tempfile.TemporaryDirectory() as tmp_dir_str:
        tmp_dir = Path(tmp_dir_str)
        drop_dir = tmp_dir / "manual_drop"
        drop_dir.mkdir(parents=True, exist_ok=True)

        # File 1: valid 22 Oct file
        f1 = drop_dir / "BhavCopyDateWise_22102026.csv"
        shutil.copyfile(FILE_22OCT, f1)

        # File 2: exact same bytes with _1 suffix
        f2 = drop_dir / "BhavCopyDateWise_22102026_1.csv"
        shutil.copyfile(FILE_22OCT, f2)

        importer = ManualImporter(manual_drop_dir=drop_dir, quarantine_dir=tmp_dir / "q")
        res = importer.import_all()

        assert res["accepted_count"] == 1
        assert res["quarantined_count"] == 1
        assert res["results"][1]["reason"] == "DUPLICATE_CONTENT_HASH"
