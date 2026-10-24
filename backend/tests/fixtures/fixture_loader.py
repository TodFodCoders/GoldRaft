"""Loader and generator for synthetic test fixtures explicitly tagged FIXTURE/DEMO."""

import json
from pathlib import Path
from typing import Any, Dict, List

FIXTURES_FILE = Path(__file__).resolve().parent / "synthetic_gold_fixtures.json"


def get_synthetic_fixtures() -> List[Dict[str, Any]]:
    """Return synthetic golden fixture records covering required edge cases."""
    if FIXTURES_FILE.exists():
        with open(FIXTURES_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return []
