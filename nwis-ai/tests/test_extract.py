import sys
from pathlib import Path

import pandas as pd
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.data import DATA_DIR  # noqa: E402
from app.extract import extract_regex  # noqa: E402


@pytest.fixture(scope="session")
def gold():
    return pd.read_csv(DATA_DIR / "nlp_source_text.csv")


def test_extraction_matches_gold_event_type_and_depth(gold):
    """All 8 rows are templated (see app/extract.py docstring), so this checks the regex path is wired
    correctly -- it's not a test of generalization to messy real-world text."""
    correct_type = correct_depth = correct_formation = 0
    for _, row in gold.iterrows():
        r = extract_regex(row["text"])
        correct_type += r.event_type == row["gold_event_type"]
        correct_depth += r.depth_m == float(row["reference_depth_m"])
        correct_formation += r.formation == row["formation"]

    n = len(gold)
    print(f"\nevent_type {correct_type}/{n}  depth {correct_depth}/{n}  formation {correct_formation}/{n}")
    assert correct_type == n
    assert correct_depth == n
    assert correct_formation == n


def test_extraction_captures_mitigation_text(gold):
    row = gold.iloc[0]
    r = extract_regex(row["text"])
    assert r.mitigation and "ecd" in r.mitigation.lower()


def test_confidence_drops_when_fields_missing():
    full = extract_regex(
        "At approximately 2000 m MD in the Tipam formation, the well encountered kick. "
        "Mitigation applied: Shut-in; verify SIDPP/SICP; well control procedure."
    )
    partial = extract_regex("There was some trouble with the well but no clear details given.")
    assert full.confidence == 1.0
    assert partial.confidence < full.confidence
    assert partial.event_type is None


def test_extraction_matches_operational_events_descriptions():
    """Different (shorter) phrasing than nlp_source_text.csv -- a stronger check than the templated
    gold set above. Caught a real gap in the NPT pattern (its description never says 'NPT')."""
    ev = pd.read_csv(DATA_DIR / "operational_events.csv")
    correct = sum(
        extract_regex(f"{r.description}. Mitigation applied: {r.mitigation}.").event_type == r.event_type
        for _, r in ev.iterrows()
    )
    assert correct == len(ev), f"{correct}/{len(ev)} matched"


def test_spans_point_at_correct_substring(gold):
    row = gold.iloc[0]
    r = extract_regex(row["text"])
    for field, span in r.spans.items():
        assert row["text"][span.start:span.end] == span.value, field
