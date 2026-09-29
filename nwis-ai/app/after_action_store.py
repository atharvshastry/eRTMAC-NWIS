"""Persists a published after-action report as one row of searchable text (data/after_action_reports.csv),
so Autonomous After-Action Learning's "feed validated outcomes back into the knowledge system" step is a
real, inspectable file -- not a database mutation and not a claim of retraining anything. app/search.py's
build_corpus() indexes this file the same way it indexes data/nlp_source_text.csv.
"""
from __future__ import annotations

import csv
import datetime as dt
from pathlib import Path

from .data import DATA_DIR

FIELDS = [
    "report_id", "well_id", "well_name", "field", "generated_at", "lookahead_m", "radius_km",
    "min_band", "real_events", "caught", "missed", "false_alarms", "recall", "text",
]


def _path() -> Path:
    return DATA_DIR / "after_action_reports.csv"


def _ensure_header() -> None:
    p = _path()
    if not p.exists():
        with p.open("w", newline="", encoding="utf-8") as f:
            csv.DictWriter(f, fieldnames=FIELDS).writeheader()


def save_after_action_report(report: dict) -> dict:
    """Appends one row summarizing an after_action_report() result. Idempotent in spirit but not in
    effect -- publishing the same well twice adds two rows (each is a snapshot at that point in time,
    same as re-running a real after-action review would produce); the UI/route layer decides whether
    to allow that."""
    _ensure_header()
    s = report["summary"]
    row = {
        "report_id": f"AAR-{report['well_id']}-{int(dt.datetime.utcnow().timestamp())}",
        "well_id": report["well_id"], "well_name": report["well_name"], "field": report["field"],
        "generated_at": dt.datetime.utcnow().isoformat(timespec="seconds") + "Z",
        "lookahead_m": report["settings"]["lookahead_m"], "radius_km": report["settings"]["radius_km"],
        "min_band": report["settings"]["min_band"],
        "real_events": s["real_events"], "caught": s["caught"], "missed": s["missed"],
        "false_alarms": s["false_alarms"], "recall": s["recall"] if s["recall"] is not None else "",
        "text": report["lessons_learned"],
    }
    with _path().open("a", newline="", encoding="utf-8") as f:
        csv.DictWriter(f, fieldnames=FIELDS).writerow(row)
    return row
