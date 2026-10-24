"""Generate backend/config/mcx_holidays.csv from raw reference files."""

import csv
import datetime
from pathlib import Path

RAW_DIR = Path(__file__).resolve().parent.parent / "config" / "holidays" / "raw"
OUTPUT_FILE = Path(__file__).resolve().parent.parent / "config" / "mcx_holidays.csv"

FILES = [
    "MCX_Trading_Holidays_2025.csv",
    "MCX_Trading_Holidays_2026.csv",
]


def generate_holidays_csv():
    records = []

    for filename in FILES:
        filepath = RAW_DIR / filename
        if not filepath.exists():
            raise FileNotFoundError(f"Required raw holiday file missing: {filepath}")

        with open(filepath, "r", encoding="utf-8-sig") as f:
            reader = csv.reader(f)
            header = next(reader)

            for row in reader:
                if not row or not any(row):
                    continue

                holiday_desc = row[0].strip()
                date_str = row[1].strip()
                day_str = row[2].strip()
                morning_str = row[3].strip()
                evening_str = row[4].strip()

                # Validate Date and Weekday
                dt = datetime.date.fromisoformat(date_str)
                expected_day = dt.strftime("%A")
                if expected_day.lower() != day_str.lower():
                    raise ValueError(
                        f"Day mismatch in {filename} for {date_str}: listed '{day_str}' vs actual '{expected_day}'"
                    )

                if dt.weekday() in (5, 6):
                    raise ValueError(
                        f"Holiday falls on a weekend in {filename}: {date_str} is {expected_day}"
                    )

                # Special note handling for asterisk
                special_note = ""
                morning_open = "open" in morning_str.lower()

                if "*" in evening_str:
                    special_note = "Closed*"
                    evening_open = False
                else:
                    evening_open = "open" in evening_str.lower()

                records.append({
                    "date": date_str,
                    "description": holiday_desc,
                    "morning_open": str(morning_open).lower(),
                    "evening_open": str(evening_open).lower(),
                    "special_note": special_note,
                    "source_file": filename,
                    "source_url": "",
                    "downloaded_on": "2026-10-24",
                    "verified": "false",
                })

    # Sort by date
    records.sort(key=lambda r: r["date"])

    with open(OUTPUT_FILE, "w", newline="", encoding="utf-8") as f:
        fieldnames = [
            "date",
            "description",
            "morning_open",
            "evening_open",
            "special_note",
            "source_file",
            "source_url",
            "downloaded_on",
            "verified",
        ]
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(records)

    print(f"Generated {len(records)} holiday records in {OUTPUT_FILE}")
    return records


if __name__ == "__main__":
    generate_holidays_csv()
