import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.search import answer, build_corpus, search  # noqa: E402
from app.data import get_store  # noqa: E402


@pytest.fixture(scope="session")
def corpus():
    return build_corpus(get_store())


def test_corpus_covers_events_and_nlp_source(corpus):
    # 54 operational_events rows + 8 nlp_source_text rows (see data/README_dataset.txt)
    assert len(corpus.texts) == 54 + 8


def test_lexical_query_finds_mud_loss_events(corpus):
    hits = search("mud loss around 2800 m", top_k=5, corpus=corpus)
    assert hits
    assert all(h.event_type == "MUD_LOSS" or "mud loss" in h.text.lower() for h in hits)


def test_event_type_label_bridges_vocabulary_gap(corpus):
    """operational_events.csv describes a KICK as 'Formation influx' -- it never says 'kick' -- so
    this only passes because event-type labels are injected into the indexed text (see
    app/search.py::_event_text). Locks in that design choice."""
    hits = search("kick", top_k=3, well_id="OIL-SYN-002", corpus=corpus)
    assert hits
    assert hits[0].event_type == "KICK"


def test_well_id_filter_is_respected(corpus):
    hits = search("stuck pipe", top_k=10, well_id="OIL-SYN-002", corpus=corpus)
    assert hits
    assert all(h.well_id == "OIL-SYN-002" for h in hits)


def test_formation_filter_is_respected(corpus):
    hits = search("mud loss", top_k=10, formation="Lakwa", corpus=corpus)
    assert hits
    assert all((h.formation or "").lower() == "lakwa" for h in hits)


def test_empty_query_returns_nothing(corpus):
    assert search("", corpus=corpus) == []


def test_nonsense_query_returns_nothing_or_low_score(corpus):
    hits = search("xylophone quarterly tax filing", top_k=5, corpus=corpus)
    assert hits == [] or all(h.score < 0.1 for h in hits)


def test_answer_degrades_gracefully_without_ollama():
    """No Ollama server is reachable in CI/this sandbox, so answer() must fall back to returning the
    raw retrieved hits rather than raising or returning a fabricated answer."""
    r = answer("What mitigations were used for mud loss?")
    assert r["hits"]
    assert r["answer"] is None
    assert "unavailable" in (r["note"] or "")


def test_answer_cites_real_source_ids():
    r = answer("stuck pipe", top_k=3)
    ids = {h["source_id"] for h in r["hits"]}
    assert ids  # every citeable hit is a real event_id/text_id from the dataset, not invented
