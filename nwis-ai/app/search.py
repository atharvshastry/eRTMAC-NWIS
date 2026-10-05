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

from sklearn.feature_extraction.text import ENGLISH_STOP_WORDS, TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from .data import Store
from .risk import LABELS

import concurrent.futures

# A dedicated worker thread for Ollama calls. Why a thread at all: plain
# urllib.request.urlopen(..., timeout=N) does NOT bound the TOTAL time a call can take -- that
# timeout applies per socket operation (connect, or each individual recv), so a server that
# trickles bytes back slowly (as Ollama's chunked HTTP responses can) keeps resetting the clock,
# and the call can run far longer than N in wall-clock time. Confirmed live on this project: with
# urlopen's own timeout=20 and an already-warm model, a grounded request (longer prompt, more
# output) still took close to 50s end to end -- not the ~20s the code appeared to promise.
# Future.result(timeout=N) enforces a TRUE wall-clock deadline regardless of what the socket is
# doing underneath, which is what a live-demo chatbot actually needs. The abandoned call's thread
# keeps running in the background when this fires (Python can't force-kill a thread); that's
# harmless here -- Ollama finishes or doesn't, and the next call benefits from keep_alive either way.
_OLLAMA_EXECUTOR = concurrent.futures.ThreadPoolExecutor(max_workers=4, thread_name_prefix="ollama")


def _post_ollama(payload: dict, timeout: float) -> str:
    """POST `payload` to Ollama's /api/chat and return the reply text, with `timeout` enforced as
    a real wall-clock deadline (see _OLLAMA_EXECUTOR's docstring above for why that needs a thread
    rather than urlopen's own timeout= kwarg). Raises on failure or timeout -- callers decide how
    to degrade."""
    import urllib.request

    def _do_call() -> str:
        host = os.getenv("OLLAMA_HOST", "http://localhost:11434")
        req = urllib.request.Request(
            f"{host}/api/chat",
            data=json.dumps(payload).encode(),
            headers={"Content-Type": "application/json"},
        )
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            body = json.loads(resp.read())
        return body["message"]["content"]

    future = _OLLAMA_EXECUTOR.submit(_do_call)
    return future.result(timeout=timeout)

_WORD_RE = re.compile(r"[A-Za-z][A-Za-z0-9_]+")

# TfidfVectorizer does no stemming by default, so a query typed in the natural plural ("kicks",
# "mud losses") can fail to match corpus text that -- per this dataset's own event-type labels and
# descriptions (_event_text above) -- is almost always singular ("Kick / influx", "Mud loss").
# Confirmed live: "what caused past kicks near this well" returned zero hits; the identical query
# with "kick" (singular) returned five real, on-topic hits -- a single trailing "s" was enough to
# drop the cosine similarity to exactly zero. This is a light, dependency-free normalizer (no
# external stemmer, no network/model download needed, consistent with this module's existing
# no-network constraint) covering the dominant case for this domain's vocabulary -- regular
# singular/plural nouns (event/events, loss/losses, incident/incidents, zone/zones) -- not a
# general-purpose English stemmer.
_STRIP_TWO_SUFFIXES = ("sses", "ches", "shes", "xes", "zes")


def _normalize_token(word: str) -> str:
    if len(word) <= 3:
        return word
    if word.endswith("ies"):
        return word[:-3] + "y"
    if word.endswith(_STRIP_TWO_SUFFIXES):
        return word[:-2]
    if word.endswith("s") and not word.endswith("ss"):
        return word[:-1]
    return word


def _tokenize_and_stem(text: str) -> list[str]:
    """Custom TfidfVectorizer tokenizer: regex-tokenize (same pattern as _WORD_RE elsewhere in
    this file), drop English stop words, then normalize each surviving token -- applied
    identically to corpus text at index time and to every query at search time, since both go
    through the same fitted vectorizer's .transform()."""
    tokens = (m.group(0).lower() for m in _WORD_RE.finditer(text))
    return [_normalize_token(t) for t in tokens if t not in ENGLISH_STOP_WORDS]


@dataclass
class SearchHit:
    source_type: str          # "event" | "nlp_source" | "after_action" | "well_status" | "risk_assessment"
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
        tokenizer=_tokenize_and_stem, token_pattern=None, lowercase=True,
        ngram_range=(1, 2), min_df=1, sublinear_tf=True,
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


_ANSWER_SYSTEM_PROMPT = """You are the eRTMAC-NWIS drilling assistant, a helpful general-purpose
AI. You may be given numbered source snippets, labeled by type:

- "well_status" / "risk_assessment" snippets are real, current, computed facts about the specific
  well the user is looking at right now (this project's own well data and its calibrated
  offset-well risk engine) -- always accurate and relevant whenever the question concerns that
  well's status, depth, formation, or risks. Use these confidently and cite them. A snippet marked
  "formation not known at this depth" means exactly that -- say formation isn't known rather than
  guessing one from a field name or anything else nearby; never state a formation that isn't given
  to you labeled as this well's formation.
- Any other snippet is retrieved historical incident text, found by an automated keyword search
  that can surface a snippet sharing one word with the question but not actually relevant (e.g. a
  question using "works" matching a note that mentions a "work string"). Only use and cite ones
  that genuinely answer the question.

Mark every snippet you use inline with its bracketed number as you use it, e.g. "a kick risk near
2600m [1] and cementing issues at offset wells [2]" -- not saved for the end, and not left as a
bare restated fact with no bracket. If nothing given actually answers the question -- including
when nothing is given at all -- ignore it completely and answer normally from your own general
knowledge instead, with no bracketed numbers. Don't mention irrelevant snippets or apologize for
them, just answer. Keep it to 2-3 sentences -- this is a live chat, not a report."""

# Matches an inline citation like "[1]" or "[2, 3]" in a generated answer -- used to tell whether
# the model actually grounded its answer in a retrieved snippet or chose to ignore weak/irrelevant
# ones and answer from general knowledge instead (see answer() below).
_CITATION_RE = re.compile(r"\[\d+(?:,\s*\d+)*\]")


def warm_ollama(keep_alive: str = "30m") -> None:
    """Force Ollama to load OLLAMA_MODEL into memory now, instead of paying that cold-load cost on
    the first real user question. Confirmed live on this machine: with the model already unloaded,
    a /search/answer call for an ungrounded (general-knowledge) question returned `answer: null`
    even with a 20s budget in answer() below -- the cold load plus partial-CPU generation (this
    machine only fits part of a 7B model in VRAM, ~2.3GB of 5.1GB per `ollama ps`) didn't finish in
    time. That's almost certainly what the "offline demo response... again and again" complaint
    was: every question asked more than ~5 minutes (Ollama's idle-unload default) after the last
    one was silently re-paying this same cold-load cost and losing the race against the timeout.
    `keep_alive` on this call (and on the real call in answer()) asks Ollama to hold the model
    resident for 30 minutes instead, so a demo with normal gaps between questions only pays this
    cost once. Best-effort and never raises: a slow or not-yet-running Ollama at startup shouldn't
    block the API from serving the endpoints that don't need it (plain /search, /risk, etc)."""
    model = os.getenv("OLLAMA_MODEL", "qwen2.5:7b-instruct")
    payload = {
        "model": model, "stream": False, "keep_alive": keep_alive,
        # Content doesn't matter here -- this call exists purely to force the weights into memory
        # -- so num_predict is capped small to keep the warm-up itself quick.
        "options": {"num_predict": 20},
        "messages": [{"role": "user", "content": "Hi"}],
    }
    try:
        # Generous on purpose: this is a one-time startup cost (same tradeoff app/main.py's
        # lifespan already makes for the OCR engine), not a per-request budget, so there's no
        # live user waiting on it -- better to actually finish loading than to give up and have
        # the first real question hit a half-loaded model anyway.
        _post_ollama(payload, timeout=120)
        print(f"[search.warm_ollama] {model} loaded and warm")
    except Exception as e:  # noqa: BLE001 -- best-effort warm-up, never fatal to startup
        print(f"[search.warm_ollama] couldn't warm {model} (will load on first real question instead): {type(e).__name__}: {e}")


def _well_context_hits(well_id: str) -> list[SearchHit]:
    """Real, current context for `well_id`: a basic status line plus a calculated risk assessment
    from the exact same calibrated engine Risk Intelligence uses (risk.py's assess()), run at the
    well's own current/final depth (`actual_td_m` -- the same convention Risk Intelligence's own
    demo cards already use for historical wells; for the ACTIVE well this ends up being its target
    depth rather than a true live position, since the chatbot isn't currently given a live depth to
    assess from -- a known, reasonable limitation, not a bug).

    Why this exists: a well-scoped question like "what are the risks [in the current well]" barely
    text-overlaps any single historical event description, so TF-IDF retrieval alone was finding
    nothing (or something irrelevant) for exactly the questions this app's own risk engine already
    answers well -- the chatbot was falling back to generic textbook drilling-safety trivia, or
    failing outright, instead of using data the app already computes correctly elsewhere (Risk
    Intelligence). Returned as ordinary SearchHit-shaped items so they flow through the exact same
    numbered-citation/grounding mechanism as a TF-IDF hit -- the LLM can cite them as [N] like
    anything else, and a caller sees them in the response's `hits` the same way it already sees
    TF-IDF hits. Returns [] if the well is unknown or has no usable depth; callers degrade cleanly
    either way, same as any other empty hit list."""
    from .data import get_store
    from .risk import assess

    store = get_store()
    w = store.wells.get(well_id)
    if not w or not w.get("actual_td_m"):
        return []
    depth_md = float(w["actual_td_m"])
    well_name = w.get("well_name") or well_id

    status_hit = SearchHit(
        source_type="well_status", source_id=f"STATUS-{well_id}", well_id=well_id, well_name=well_name,
        depth_m=depth_md, formation=None, event_type=None, score=1.0,
        text=(f"Field {w.get('field') or 'unknown'}, status {w.get('status') or 'unknown'}, "
              f"current/total depth {depth_md:.0f} m MD."),
    )
    out = [status_hit]

    try:
        result = assess(store, depth_md=depth_md, well_id=well_id, lookahead_m=150, radius_km=30, min_band="LOW")
    except Exception as e:  # noqa: BLE001 -- never let a risk-engine hiccup break the chatbot
        print(f"[search._well_context_hits] assess() failed for {well_id}: {type(e).__name__}: {e}")
        result = None

    if result:
        # Free from assess()'s own return shape -- same field /risk/assess already exposes.
        status_hit.formation = result.get("formation")
        if result["alerts"]:
            # Capped to the top 2 (assess() already sorts alerts highest-band/score first) --
            # confirmed live that even 3 modest well-context snippets alone (no TF-IDF hits at
            # all) pushed a grounded answer's generation past the 20s budget on this machine's
            # partial-CPU setup, where a 0-snippet question comfortably finished well inside it.
            # A well with many simultaneous flagged hazards would make this worse still, so the
            # cap is on count, not a one-off tweak for this test case.
            for a in result["alerts"][:2]:
                out.append(SearchHit(
                    source_type="risk_assessment", source_id=f"{a['event_type']}@{a['zone_from_m']:.0f}m",
                    well_id=well_id, well_name=well_name, depth_m=a["zone_from_m"],
                    formation=result.get("formation"), event_type=a["event_type"], score=a["score"],
                    # assess() already writes a ready-made natural-language sentence per alert (band,
                    # nearby-well tally, zone, typical NPT, top mitigation) -- reuse it verbatim rather
                    # than re-deriving a summary from the structured fields.
                    text=a["message"],
                ))
        else:
            out.append(SearchHit(
                source_type="risk_assessment", source_id=f"NONE@{depth_md:.0f}m", well_id=well_id,
                well_name=well_name, depth_m=depth_md, formation=result.get("formation"), event_type=None,
                score=1.0,
                text=("No hazard type currently clears the calibrated risk threshold against this "
                      "well's nearby offset wells -- i.e. nothing is flagged given current data and "
                      "calibration, which is not the same as a guarantee of safety."),
            ))
    return out


def answer(query: str, top_k: int = 5, **filters) -> dict:
    """Retrieval-augmented answer when the question matches real drilling records in this dataset,
    or concerns the specific well in context (grounded=True, cites them -- see
    _ANSWER_SYSTEM_PROMPT and _well_context_hits); otherwise still answers via Ollama as a normal
    general-purpose assistant (grounded=False) instead of refusing, since this chatbot is meant to
    work like a real AI assistant, not a tool that only ever answers a narrow slice of pre-matched
    questions. The `grounded` flag lets a caller/UI label the two cases honestly rather than
    implying every answer traces back to a real record. On any Ollama failure (unreachable,
    timeout, bad response) this falls back to the raw retrieved hits if there are any, or a plain
    not-found note if there aren't -- the API never breaks just because Ollama is down or slow."""
    well_id = filters.get("well_id")
    well_ctx_hits = _well_context_hits(well_id) if well_id else []
    # When well-scoped, leave less room for TF-IDF text so the combined prompt stays within the
    # latency budget confirmed live below -- well-context hits already carry the primary signal
    # for a well-specific question, so historical text is now a secondary, supplementary source
    # rather than the only one, and doesn't need its full usual top_k allowance.
    text_top_k = min(top_k, 3) if well_ctx_hits else top_k
    text_hits = search(query, top_k=text_top_k, **filters)
    # Well-context hits go first: they're always-accurate current facts about the well in view
    # (see _well_context_hits), not maybe-relevant retrieved text, so putting them at [1]/[2] puts
    # them first in line for a well-scoped question without requiring them to out-score anything.
    combined_hits = well_ctx_hits + text_hits

    if combined_hits:
        # h.formation can genuinely be None (no formation-top data covers this well at this depth
        # -- confirmed live for some real wells/depths in this dataset) -- rendering that as the bare
        # word "None" invited exactly the failure this is guarding against: confirmed live, the model
        # once filled that slot in by eye from the FIELD name sitting right there in a well_status
        # hit's own text ("Field Assam Shelf - Naharkatiya..."), confidently answering "the
        # Naharkatiya formation" when the true answer was "not known at this depth." An explicit,
        # unambiguous label leaves it nothing plausible-looking to substitute.
        numbered = "\n".join(
            f"[{i+1}] ({h.source_type}, well {h.well_id}, {h.depth_m}m, "
            f"formation {h.formation or 'not known at this depth'}): {h.text}"
            for i, h in enumerate(combined_hits)
        )
        user_content = f"Question: {query}\n\nPossibly relevant sources (see system prompt -- use only if actually relevant):\n{numbered}"
    else:
        user_content = query

    payload = {
        "model": os.getenv("OLLAMA_MODEL", "qwen2.5:7b-instruct"), "stream": False,
        # Keep the model resident for the rest of a demo session (Ollama's own default is to
        # unload after 5 minutes idle) -- see warm_ollama() above for why repeated cold loads
        # were the actual cause of answers silently failing on this machine.
        "keep_alive": "30m",
        # Confirmed live that even a WARM model can still take a long time on the grounded path
        # specifically: it has more to read (several numbered snippets) and, left to its own
        # judgment, writes a longer answer than the general-knowledge path's one-liners -- and on
        # this machine's partial-CPU generation (~4.4 tokens/sec measured directly against Ollama,
        # see timeout= below), more output tokens costs real wall-clock time almost linearly. The
        # system prompt asks for 2-3 sentences, but models don't always obey a length instruction,
        # so num_predict is a hard backstop capping how many tokens Ollama will generate no matter
        # what it decides to write -- which also bounds the WORST-CASE generation time the timeout
        # below needs to cover. Measured naturally-stopped answers for real well-scoped questions
        # ranged 29-78 tokens (a short depth/formation fact vs. a multi-hazard risk summary), so 100
        # gives real headroom above anything seen without paying for 160's worth of worst-case wait.
        "options": {"num_predict": 100},
        "messages": [
            {"role": "system", "content": _ANSWER_SYSTEM_PROMPT},
            {"role": "user", "content": user_content},
        ],
    }
    try:
        # This machine only fits part of a 7B model in VRAM (~2.3GB of 5.1GB per `ollama ps`), so
        # generation partly runs on CPU and is genuinely slow -- measured directly against Ollama
        # (bypassing this timeout, several runs): ~270ms-4.7s to prefill a ~590-token well-context
        # prompt (cached vs. cold), then decode at a steady ~4.4 tokens/sec regardless of prompt.
        # Sized to clear this hardware's WORST case, not just the typical one: at num_predict=100
        # above, a maximally-long answer costs 100/4.4 =~ 23s of decode alone, plus =~5s of cold
        # prefill -- call it 29s of real possible work. 35s leaves real margin above that rather
        # than one that might clip a well-formed answer a second or two from finishing, while
        # staying well short of the near-minute waits an earlier, much longer timeout chain caused
        # (see git history / project notes) for a different problem. The Node backend's own call to
        # this endpoint and the frontend's client timeout are raised to match, each a real step
        # ahead of the one below it rather than racing it (see search.routes.js, aiApi.js).
        text = _post_ollama(payload, timeout=35)
    except Exception as e:  # noqa: BLE001 -- Ollama down/unreachable/slow: degrade gracefully
        # Previously swallowed with no trace at all, which made this exact kind of failure
        # (model present and loaded, but still failing) impossible to diagnose remotely --
        # logged here so the real cause (timeout vs. connection error vs. bad response shape)
        # shows up in the uvicorn console instead of requiring another guess-and-check round.
        print(f"[search.answer] Ollama call failed: {type(e).__name__}: {e}")
        text = None

    if text:
        # `combined_hits` being non-empty doesn't mean the answer is actually grounded in them --
        # on a small corpus, retrieval can surface a snippet that shares one word with the question
        # but isn't relevant (the "works"/"work string" case above), and a well with no well_id
        # filter contributes no well-context hits at all. The system prompt tells the model to
        # ignore irrelevant snippets and answer generally instead. Trust what the model actually
        # did, not just whether context was available: grounded only when it both had hits AND
        # actually cited one -- this also correctly keeps a well-scoped but unrelated question (e.g.
        # "tell me a joke" with a well in context) ungrounded, since the model won't cite the well
        # data for that.
        grounded = bool(combined_hits) and bool(_CITATION_RE.search(text))
        shown_hits = combined_hits if grounded else []

        # Confirmed live, repeatedly, even after strengthening the citation instruction above: the
        # model reliably USES well_ctx_hits (the exact numbers -- zone depths, "N of M nearby
        # wells" -- show up correctly in the prose) but doesn't reliably mark them with [N], so the
        # citation check above alone was mislabeling real, accurate, well-specific answers as
        # ungrounded general knowledge -- the opposite failure from the one that check exists to
        # prevent, and a worse one: it hides correct eRTMAC data behind an "unverified" label rather
        # than mislabeling noise as relevant. well_ctx_hits don't have the TF-IDF "maybe irrelevant"
        # problem the citation check guards against -- they're always real, current facts about
        # this exact well when present -- so fall back to a cheap, specific content check instead of
        # giving up on grounding them. Confirmed live this needs more than just the well id/name: a
        # formation+depth question answered correctly ("We are in the Naharkatiya formation...")
        # without ever naming the well itself. So check every distinguishing string the well-context
        # hits actually carry -- id, name, and (once assess() succeeds) formation -- not just the
        # first two: an unrelated question (a joke, something off-topic) wouldn't plausibly happen
        # to mention this well's id, name, OR its formation by coincidence.
        if not grounded and well_ctx_hits:
            needles = {well_id}
            for h in well_ctx_hits:
                if h.well_name:
                    needles.add(h.well_name)
                if h.formation:
                    needles.add(h.formation)
            if any(n in text for n in needles):
                grounded = True
                shown_hits = well_ctx_hits  # only the always-trustworthy ones, not unverified TF-IDF hits

        return {
            "query": query, "answer": text,
            "hits": [h.__dict__ for h in shown_hits],
            "grounded": grounded, "note": None,
        }

    if combined_hits:
        return {
            "query": query, "answer": None, "hits": [h.__dict__ for h in combined_hits], "grounded": True,
            "note": "LLM synthesis unavailable; showing retrieved sources only.",
        }

    return {
        "query": query, "answer": None, "hits": [], "grounded": False,
        "note": (
            "I couldn't find anything in the dataset matching that question, and the AI service "
            "isn't reachable right now to answer it generally either. Try again in a moment, or "
            "ask about a specific formation, well, or event type -- mud loss, kick, stuck pipe, "
            "cementing issue, torque spike, or NPT."
        ),
    }
