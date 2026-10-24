"""Test to ensure template mock strings and leftover scaffolding never reappear."""

from pathlib import Path
import pytest

FRONTEND_DIRS = [
    Path(__file__).resolve().parent.parent.parent / "app",
    Path(__file__).resolve().parent.parent.parent / "components",
    Path(__file__).resolve().parent.parent.parent / "lib",
]

FORBIDDEN_STRINGS = [
    "Eddie Lake",
    "Sprint Velocity",
    "PR Cycle Time",
    "Quality Pass Rate",
    "Active Reviewers 18 online",
    "Sprint 32",
    "Jane Doe",
    "Sarah Chen",
    "AI Sync Active",
    "Poppins font active",
    "Export Report",
    "New Deliverable",
    "Deliverables & Tasks",
    "Team Capacity",
]


def test_no_template_mock_strings_in_frontend():
    """Fail if any forbidden template or mock string is present in frontend files."""
    violations = []

    for d in FRONTEND_DIRS:
        if not d.exists():
            continue
        for ext in ("*.tsx", "*.ts", "*.json", "*.jsx", "*.js"):
            for f in d.rglob(ext):
                # Ignore node_modules, build artifacts or data.json if any
                if "node_modules" in f.parts or ".next" in f.parts:
                    continue
                content = f.read_text(encoding="utf-8", errors="replace")
                for s in FORBIDDEN_STRINGS:
                    if s in content:
                        violations.append(f"{f.name}: found forbidden mock string '{s}'")

    assert not violations, f"Template mock strings found in frontend source:\n" + "\n".join(violations)
