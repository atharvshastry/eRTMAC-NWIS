"""Searchable knowledge repository (PS 26121 requirement iii): hybrid retrieval over the
operational-events log and extracted report excerpts, with every hit citing its source record so an
engineer can verify it instead of trusting a bare answer.

Two retrieval signals, combined (this is the "hybrid" in hybrid search):
  1. TF-IDF cosine similarity over event descriptions/mitigations/narrative text -- a real, working
     similarity signal that needs no model download and no network, which matters because this sandbox
     has no route to Hugging Face or an embeddings API (see note below). It also suits this dataset:
     the language is short and domain-heavy ("mud loss", "stuck pipe", "kick"), which is exactly where
     TF-IDF does well.
  2. Exact substring / event-type match -- catches precise terms like "3200m" or "MUD_LOSS" that a
     bag-of-words cosine score can under-rank.

Production upgrade path: swap `_vectorize_corpus`'s TfidfVectorizer for real sentence embeddings
(`BAAI/bge-small-en-v1.5` via sentence-transformers, per the tech-stack doc) once you have network
access to download the model -- this sandbox could not reach huggingface.co to test that path, so it
is NOT implemented here as dead untested code; the swap point is `Store.embedding_matrix()` and is a
few lines once the model is available. TF-IDF and bge-small share the same interface downstream
(a query vector, cosine similarity, top-k), so nothing else in this file has to change.

Optional answer synthesis (`answer()`) calls Ollama to turn the retrieved snippets into one cited
paragraph. Like `extract.extract_llm`, this is UNTESTED in this sandbox (no outbound access to an
Ollama server here) -- verify it against a running Ollama before relying on it. Retrieval itself
(`search()`) needs no LLM and is fully tested (see tests/test_search.py).
"""
from __future__ import annotations

import json
import os
import re
from dataclasses import dataclass, field
from functools import lru_cache
from typing import Optional

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from .data import Store
from .risk import LABELS

_WORD_RE = re.compile(r"[A-Za-z][A-Za-z0-9_]+")


@dataclass
class SearchHit:
    source_type: str          # "event" | "nlp_source"
    source_id: str            # event_id or text_id
    well_id: str
    well_name: str
    depth_m: Optional[float]
    formation: Optional[str]
    event_type: Optional[str]
    text: str                 # the snippet to cite/display
    score: float
    match: dict = field(default_factory=dict)  # {"tfidf": float, "exact": bool}


@dataclass
class _Corpus:
    ids: list[tuple[str, str]]     # (source_type, source_id) parallel to rows
    meta: list[dict]
    texts: list[str]
    vectorizer: TfidfVectorizer
    matrix: "object"               # sparse tf-idf matrix, rows aligned to ids/meta/texts


def _event_text(e: dict) -> str:
    """Description/mitigation prose alone often skips the very word an engineer would search for
    (e.g. a KICK event's description says "Formation influx", never "kick") -- so the indexed text
    is prefixed with the human-readable event-type label (same labels risk.py shows in alerts) and
    the formation name, letting the structured fields carry query terms the free text doesn't."""
    label = LABELS.get(e.get("event_type"), e.get("event_type") or "")
    parts = [label, e.get("formation") or "", e.get("description") or "", e.get("mitigation") or ""]
    return ". ".join(p for p in parts if p)


def build_corpus(store: Store) -> _Corpus:
    ids: list[tuple[str, str]] = []
    meta: list[dict] = []
    texts: list[str] = []

    for e in store.events:
        ids.append(("event", e["event_id"]))
        meta.append({
            "well_id": e["well_id"], "well_name": store.wells[e["well_id"]]["well_name"],
            "depth_m": e["depth_md_m"], "formation": e["formation"], "event_type": e["event_type"],
        })
        texts.append(_event_text(e))

    import pandas as pd
    from .data import DATA_DIR
    nlp_path = DATA_DIR / "nlp_source_text.csv"
    if nlp_path.exists():
        nlp = pd.read_csv(nlp_path)
        for r in nlp.to_dict("records"):
            ids.append(("nlp_source", str(r["text_id"])))
            meta.append({
                "well_id": r["well_id"], "well_name": store.wells.get(r["well_id"], {}).get("well_name", r["well_id"]),
                "depth_m": r.get("reference_depth_m"), "formation": r.get("formation"),
                "event_type": r.get("gold_event_type"),
            })
            label = LABELS.get(r.get("gold_event_type"), r.get("gold_event_type") or "")
            texts.append(f"{label}. {r['text']}" if label else str(r["text"]))

    # Published Autonomous After-Action reports (app/after_action_store.py) -- lessons-learned prose
    # generated from a real predicted-vs-actual replay (app/backtest.py::after_action_report), indexed
    # the same way as nlp_source_text.csv so an engineer's /search or /search/answer query can surface
    # past lessons. This is the ONLY way after-action output re-enters this file: appended searchable
    # text, never a change to risk.py's scoring logic.
    aar_path = DATA_DIR / "after_action_reports.csv"
    if aar_path.exists() and aar_path.stat().st_size > 0:
        aar = pd.read_csv(aar_path)
        for r in aar.to_dict("records"):
            ids.append(("after_action", str(r["report_id"])))
            meta.append({
                "well_id": r["well_id"], "well_name": r.get("well_name") or r["well_id"],
                "depth_m": None, "formation": None, "event_type": None,
            })
            texts.append(f"After-action lessons learned. {r['text']}")

    vectorizer = TfidfVectorizer(
        lowercase=True, stop_words="english", ngram_range=(1, 2), min_df=1, sublinear_tf=True,
    )
    matrix = vectorizer.fit_transform(texts) if texts else None
    return _Corpus(ids=ids, meta=meta, texts=texts, vectorizer=vectorizer, matrix=matrix)


@lru_cache(maxsize=1)
def get_corpus() -> _Corpus:
    from .data import get_store
    return build_corpus(get_store())


def _exact_hit(query: str, text: str) -> bool:
    q = query.strip().lower()
    return bool(q) and q in text.lower()


def search(
    query: str,
    top_k: int = 5,
    well_id: str | None = None,
    formation: str | None = None,
    event_type: str | None = None,
    corpus: _Corpus | None = None,
) -> list[SearchHit]:
    """Hybrid TF-IDF + exact-match search over incidents and extracted report text. Every hit is a
    real source record (event_id or text_id) with its own well/depth/formation, so a caller can cite
    it -- see module docstring for the design rationale."""
    corpus = corpus or get_corpus()
    if not corpus.texts or not query.strip():
        return []

    qvec = corpus.vectorizer.transform([query])
    sims = cosine_similarity(qvec, corpus.matrix)[0]

    hits: list[SearchHit] = []
    for i, ((stype, sid), m, text, sim) in enumerate(zip(corpus.ids, corpus.meta, corpus.texts, sims)):
        if well_id and m["well_id"] != well_id:
            continue
        if formation and (m.get("formation") or "").lower() != formation.lower():
            continue
        if event_type and (m.get("event_type") or "") != event_type:
            continue
        exact = _exact_hit(query, text)
        score = float(sim) + (0.15 if exact else 0.0)  # small deterministic boost, not a rescale
        if score <= 0:
            continue
        hits.append(SearchHit(
            source_type=stype, source_id=sid, well_id=m["well_id"], well_name=m["well_name"],
            depth_m=m.get("depth_m"), formation=m.get("formation"), event_type=m.get("event_type"),
            text=text, score=round(score, 4), match={"tfidf": round(float(sim), 4), "exact": exact},
        ))

    hits.sort(key=lambda h: -h.score)
    return hits[:top_k]


_ANSWER_SYSTEM_PROMPT = """You are a drilling-engineering assistant. Answer the question using ONLY
the numbered source snippets given. Cite sources inline as [1], [2] etc. If the snippets don't answer
the question, say so plainly instead of guessing."""


def answer(query: str, top_k: int = 5, **filters) -> dict:
    """Retrieval-augmented answer: retrieves with `search()` (tested, no network needed), then asks
    Ollama to write one cited paragraph from the retrieved snippets. UNTESTED in this sandbox -- no
    outbound access to an Ollama server here; verify against a running instance before relying on it.
    On any failure (Ollama unreachable, bad response) this falls back to returning the raw hits with
    no synthesized text, so the API never breaks because Ollama is down -- it just degrades to plain
    search results, which is the honest behaviour for a demo machine that may not have Ollama running."""
    hits = search(query, top_k=top_k, **filters)
    if not hits:
        return {"query": query, "answer": None, "hits": [], "note": "No matching records."}

    numbered = "\n".join(
        f"[{i+1}] (well {h.well_id}, {h.depth_m}m, {h.formation}): {h.text}" for i, h in enumerate(hits)
    )
    try:
        import urllib.request

        host = os.getenv("OLLAMA_HOST", "http://localhost:11434")
        payload = {
            "model": os.getenv("OLLAMA_MODEL", "qwen2.5:7b-instruct"), "stream": False,
            "messages": [
                {"role": "system", "content": _ANSWER_SYSTEM_PROMPT},
                {"role": "user", "content": f"Question: {query}\n\nSources:\n{numbered}"},
            ],
        }
        req = urllib.request.Request(f"{host}/api/chat", data=json.dumps(payload).encode(),
                                     headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=30) as resp:
            body = json.loads(resp.read())
        text = body["message"]["content"]
    except Exception as e:  # noqa: BLE001 -- Ollama down/unreachable: degrade to plain search
        text = None

    return {
        "query": query,
        "answer": text,
        "hits": [h.__dict__ for h in hits],
        "note": None if text else "LLM synthesis unavailable; showing retrieved sources only.",
    }
