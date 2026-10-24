"""GoldRaft Command Line Interface."""

import argparse
import sys
from pathlib import Path

from backend.ingestion.manual_importer import ManualImporter
from backend.storage.parquet_store import get_parquet_store


def import_all_command(drop_dir_str: str = None):
    drop_dir = Path(drop_dir_str) if drop_dir_str else None
    importer = ManualImporter(manual_drop_dir=drop_dir)
    res = importer.import_all()

    print("\n" + "=" * 105)
    print(f"{'FILENAME':<35} | {'REQUESTED':<10} | {'CONTENT':<10} | {'SHA256':<12} | {'STATUS':<10} | {'REASON'}")
    print("=" * 105)

    for item in res["results"]:
        fn = item["filename"]
        req = item["requested_date"] or "N/A"
        cnt = item["content_date"] or "N/A"
        sha = item["sha256_prefix"]
        stat = item["status"]
        rsn = item["reason"]
        print(f"{fn:<35} | {req:<10} | {cnt:<10} | {sha:<12} | {stat:<10} | {rsn}")

    print("=" * 105)
    print(f"Summary: {res['accepted_count']} accepted, {res['quarantined_count']} quarantined, {res['total_records']} contract records extracted.")

    if res["records"]:
        store = get_parquet_store()
        total_stored = store.write_records(res["records"])
        print(f"Stored {total_stored} total unique contract records in Parquet database.")

    print()
    return res


def main():
    parser = argparse.ArgumentParser(description="GoldRaft Backend CLI")
    subparsers = parser.add_subparsers(dest="command")

    import_parser = subparsers.add_parser("import-all", help="Import all Bhavcopy files from manual_drop")
    import_parser.add_argument("--dir", type=str, default=None, help="Custom drop directory")

    args = parser.parse_args()

    if args.command == "import-all":
        import_all_command(args.dir)
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
