"""GoldRaft Command Line Interface."""

import argparse
import sys
from pathlib import Path

from backend.analytics.coverage import compute_coverage
from backend.ingestion.manual_importer import ManualImporter
from backend.storage.parquet_store import get_parquet_store


def import_all_command(drop_dir_str: str = None):
    drop_dir = Path(drop_dir_str) if drop_dir_str else None
    importer = ManualImporter(manual_drop_dir=drop_dir)
    res = importer.import_all()

    print("\n" + "=" * 105)
    print(f"{'FILENAME':<35} | {'REQUESTED':<10} | {'CONTENT':<10} | {'SHA256':<12} | {'STATUS':<16} | {'REASON'}")
    print("=" * 105)

    for item in res["results"]:
        fn = item["filename"]
        req = item["requested_date"] or "N/A"
        cnt = item["content_date"] or "N/A"
        sha = item["sha256_prefix"]
        stat = item["status"]
        rsn = item["reason"]
        print(f"{fn:<35} | {req:<10} | {cnt:<10} | {sha:<12} | {stat:<16} | {rsn}")

    print("=" * 105)
    already_imported = res.get("already_imported_count", 0)
    print(
        f"Summary: {res['accepted_count']} accepted, {already_imported} already imported, "
        f"{res['quarantined_count']} quarantined, {res['total_records']} new contract records extracted."
    )

    if res["records"]:
        store = get_parquet_store()
        total_stored = store.write_records(res["records"])
        print(f"Stored {total_stored} total unique contract records in Parquet database.")
    elif already_imported > 0 and res["accepted_count"] == 0:
        print("All files already stored in database. Zero new records added.")

    print()
    return res


def coverage_command(from_date: str = "2025-01-01", to_date: str = None):
    cov = compute_coverage(from_date_str=from_date, to_date_str=to_date)

    print("\n" + "=" * 80)
    print("GOLDFRAFT TRADING CALENDAR & INGESTION COVERAGE REPORT")
    print("=" * 80)
    print(f"Range Analyzed:                 {cov['range_from']} to {cov['range_to']}")
    print(f"Total Trading Days in Range:    {cov['total_trading_days_in_range']}")
    print(f"Trading Days with Accepted File:{cov['trading_days_with_file_count']}")
    print(f"Missing Trading Days:           {cov['missing_trading_days_count']}")
    print(f"Date-Trap Mismatches:           {cov['mismatched_date_trap_files_count']}")
    print(f"Duplicate SHA-256 Files:        {cov['duplicate_hash_files_count']}")
    print(f"First Ingested Session:         {cov['first_accepted_date'] or 'None'}")
    print(f"Latest Ingested Session:        {cov['last_accepted_date'] or 'None'}")
    print("=" * 80)

    print("\n[ACCEPTED TRADING SESSIONS]")
    if cov["trading_days_with_file"]:
        for d in cov["trading_days_with_file"]:
            print(f"  + {d}")
    else:
        print("  (None)")

    print(f"\n[MISSING TRADING DAYS ({cov['missing_trading_days_count']} DATES)]")
    for i, d in enumerate(cov["missing_trading_days"], start=1):
        print(f"{d}", end="\t" if i % 6 != 0 else "\n")
    print("\n" + "=" * 80 + "\n")
    return cov


def main():
    parser = argparse.ArgumentParser(description="GoldRaft Backend CLI")
    subparsers = parser.add_subparsers(dest="command")

    import_parser = subparsers.add_parser("import-all", help="Import all Bhavcopy files from manual_drop")
    import_parser.add_argument("--dir", type=str, default=None, help="Custom drop directory")

    cov_parser = subparsers.add_parser("coverage", help="Check trading calendar coverage vs ingested files")
    cov_parser.add_argument("--from", dest="from_date", type=str, default="2025-01-01", help="Start date (YYYY-MM-DD)")
    cov_parser.add_argument("--to", dest="to_date", type=str, default=None, help="End date (YYYY-MM-DD)")

    args = parser.parse_args()

    if args.command == "import-all":
        import_all_command(args.dir)
    elif args.command == "coverage":
        coverage_command(args.from_date, args.to_date)
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
