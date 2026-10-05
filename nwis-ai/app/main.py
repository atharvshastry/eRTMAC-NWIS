"""NWIS AI service. Run:  uvicorn app.main:app --port 8001 --reload"""
from contextlib import asynccontextmanager

from fastapi import FastAPI, File, HTTPException, Query, UploadFile

from pydantic import BaseModel

from .calibrate import calibrate_thresholds
from .data import get_store
from .extract import Extraction, extract
from .ocr import get_engine
from .parser import parse_pdf
from .risk import AlertTracker, assess, set_thresholds
from .schemas import ParseResponse
from .search import answer as rag_answer
from .search import get_corpus, warm_ollama
from .search import search as run_search
from .whatif import assess_whatif
from .backtest import after_action_report
from .after_action_store import save_after_action_report

MAX_BYTES = 50 * 1024 * 1024


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Calibrate per-event-type alert thresholds once at startup (see app/calibrate.py). Cheap enough
    (a couple of seconds on this dataset) to redo on every restart rather than caching to disk."""
    store = get_store()
    app.state.store = store
    app.state.thresholds = calibrate_thresholds(store)
    set_thresholds(app.state.thresholds)

    # Warm up the OCR engine now instead of on the first real /parse request. Constructing
    # PaddleOCR's pipeline (loading detection/recognition/orientation models) is a one-time cost
    # that can exceed the Node backend's upload timeout on a cold process -- which looks like a
    # failed upload even though the OCR call itself eventually succeeds in the background. Paying
    # that cost at boot means the first real document a user uploads hits an already-warm engine.
    engine, reason = get_engine()
    print(f"[startup] OCR engine ready: {engine.name if engine else 'none'} ({reason or 'ok'})")

    # Same reasoning as the OCR warm-up above, for the same failure shape: load the chat model
    # into Ollama now rather than on the first real chatbot question, and ask Ollama to hold it
    # resident for the rest of the demo (see search.warm_ollama's docstring for how this was
    # confirmed live -- a cold model was the actual cause of answers silently failing).
    warm_ollama()

    yield


app = FastAPI(title="NWIS AI service", version="0.1.0", lifespan=lifespan)


@app.get("/risk/assess")
def risk_assess(
    well_id: str = Query(..., description="Active or historical well id, e.g. OIL-SYN-ACTIVE-01"),
    depth_md_m: float = Query(...),
    lookahead_m: float = Query(150),
    radius_km: float = Query(30),
    min_band: str = Query("LOW", pattern="^(LOW|MEDIUM|HIGH)$"),
):
    """Offset-well risk assessment for the next `lookahead_m` metres below `depth_md_m`. Every alert
    carries the offset-well events behind it (see app/risk.py)."""
    try:
        return assess(app.state.store, depth_md=depth_md_m, well_id=well_id, lookahead_m=lookahead_m,
                      radius_km=radius_km, min_band=min_band)
    except KeyError as e:
        raise HTTPException(404, str(e))


@app.get("/risk/thresholds")
def risk_thresholds():
    """The per-event-type thresholds currently in effect (see app/calibrate.py)."""
    return app.state.thresholds


@app.get("/risk/whatif")
def risk_whatif(
    well_id: str = Query(..., description="Active or historical well id"),
    depth_md_m: float = Query(...),
    mud_weight_sg: float | None = Query(None, description="Proposed mud weight, specific gravity"),
    casing_setting_depth_m: float | None = Query(None, description="Proposed casing setting depth, m MD"),
    bit_type: str | None = Query(None, description="Proposed bit type, e.g. PDC"),
    lookahead_m: float = Query(150),
    radius_km: float = Query(30),
    min_band: str = Query("LOW", pattern="^(LOW|MEDIUM|HIGH)$"),
):
    """What-If Drilling Simulator (see app/whatif.py): baseline vs. reweighted risk for a proposed
    mud weight / casing depth / bit choice, evidenced by nearby wells that recorded similar conditions."""
    try:
        return assess_whatif(
            app.state.store, well_id=well_id, depth_md=depth_md_m, mud_weight_sg=mud_weight_sg,
            casing_setting_depth_m=casing_setting_depth_m, bit_type=bit_type, lookahead_m=lookahead_m,
            radius_km=radius_km, min_band=min_band,
        )
    except KeyError as e:
        raise HTTPException(404, str(e))


@app.get("/after-action/{well_id}")
def after_action(
    well_id: str,
    lookahead_m: float = Query(150),
    radius_km: float = Query(30),
    min_band: str = Query("MEDIUM", pattern="^(LOW|MEDIUM|HIGH)$"),
    step_m: int = Query(25, ge=5, le=100),
):
    """Autonomous After-Action Learning (see app/backtest.py::after_action_report): retroactively
    replays a completed well through the risk engine and diffs predicted vs. actual events. Read-only
    -- does not write to the knowledge base; call POST /after-action/{well_id}/publish for that."""
    try:
        return after_action_report(app.state.store, well_id, lookahead_m=lookahead_m, radius_km=radius_km,
                                   min_band=min_band, step_m=step_m)
    except KeyError as e:
        raise HTTPException(404, str(e))


@app.post("/after-action/{well_id}/publish")
def after_action_publish(
    well_id: str,
    lookahead_m: float = Query(150),
    radius_km: float = Query(30),
    min_band: str = Query("MEDIUM", pattern="^(LOW|MEDIUM|HIGH)$"),
    step_m: int = Query(25, ge=5, le=100),
):
    """Generates the after-action report (as GET /after-action/{well_id} does) and appends its
    lessons-learned summary to data/after_action_reports.csv, then clears the search-corpus cache so
    it's immediately findable via /search and /search/answer -- the "feed validated outcomes back into
    the knowledge system" half of the teammate-suggested feature. This appends searchable TEXT only;
    it never touches app/risk.py's scoring logic or thresholds, i.e. no model retraining happens here."""
    try:
        report = after_action_report(app.state.store, well_id, lookahead_m=lookahead_m, radius_km=radius_km,
                                     min_band=min_band, step_m=step_m)
    except KeyError as e:
        raise HTTPException(404, str(e))
    row = save_after_action_report(report)
    get_corpus.cache_clear()
    return {"published": True, "report": report, "corpus_row": row}


# One AlertTracker per well, kept for the lifetime of the process -- enough for a demo (see
# app/risk.py's AlertTracker docstring). Keyed by well_id so multiple simulated/live wells don't
# share dedup state.
_live_trackers: dict[str, AlertTracker] = {}


@app.get("/risk/live")
def risk_live(
    well_id: str = Query(..., description="Active well id being drilled, e.g. OIL-SYN-ACTIVE-01"),
    depth_md_m: float = Query(...),
    lookahead_m: float = Query(150),
    radius_km: float = Query(30),
    min_band: str = Query("LOW", pattern="^(LOW|MEDIUM|HIGH)$"),
    reset: bool = Query(False, description="Clear this well's dedup state instead of assessing -- call "
                         "this when a live/simulated feed loops back to the top of the well."),
):
    """Stateful sibling of /risk/assess for a live/simulated drilling feed: returns only the alerts that
    are *new* since the last poll for this well (band just appeared, escalated, or moved zone -- see
    AlertTracker in app/risk.py), so a UI polling this every few seconds isn't spammed with the same
    alert forever. Response is a normal /risk/assess result plus a `new_alerts` field."""
    tracker = _live_trackers.setdefault(well_id, AlertTracker())
    if reset:
        tracker._state.clear()
        return {"well_id": well_id, "depth_md_m": depth_md_m, "new_alerts": [], "reset": True}
    try:
        result = assess(app.state.store, depth_md=depth_md_m, well_id=well_id, lookahead_m=lookahead_m,
                         radius_km=radius_km, min_band=min_band)
    except KeyError as e:
        raise HTTPException(404, str(e))
    result["new_alerts"] = tracker.update(result)
    return result


@app.get("/wells")
def list_wells(field: str | None = None, data_status: str | None = Query(None, pattern="^(HISTORICAL|ACTIVE)$")):
    """All wells with location/status, for the map. Filter by field or HISTORICAL/ACTIVE."""
    out = []
    for wid, w in app.state.store.wells.items():
        if field and w.get("field") != field:
            continue
        if data_status and w.get("data_status") != data_status:
            continue
        out.append({"well_id": wid, **w})
    return out


@app.get("/wells/{well_id}")
def get_well(well_id: str):
    w = app.state.store.wells.get(well_id)
    if w is None:
        raise HTTPException(404, f"Unknown well_id {well_id}")
    return {"well_id": well_id, **w}


@app.get("/wells/nearby")
def wells_nearby(
    well_id: str = Query(..., description="Active or historical well id to search around"),
    radius_km: float = Query(30),
):
    """Historical wells within radius_km of `well_id`'s surface location, nearest first -- powers the
    map's radius circle and well list (see app/data.py::Store.nearby)."""
    store = app.state.store
    w = store.wells.get(well_id)
    if w is None:
        raise HTTPException(404, f"Unknown well_id {well_id}")
    return store.nearby(w["surface_lat"], w["surface_lon"], radius_km, exclude=(well_id,))


@app.get("/search")
def search_endpoint(
    q: str = Query(..., description="Free-text query, e.g. 'mud loss near 2800m'"),
    well_id: str | None = None,
    formation: str | None = None,
    event_type: str | None = Query(None, pattern="^(MUD_LOSS|STUCK_PIPE|KICK|TORQUE_SPIKE|CEMENTING_ISSUE|NPT)$"),
    top_k: int = Query(5, ge=1, le=20),
):
    """Hybrid search over historical incidents and extracted report text. Every hit cites its source
    record (event_id/text_id) -- see app/search.py."""
    hits = run_search(q, top_k=top_k, well_id=well_id, formation=formation, event_type=event_type,
                       corpus=get_corpus())
    return {"query": q, "hits": [h.__dict__ for h in hits]}


@app.get("/search/answer")
def search_answer_endpoint(
    q: str = Query(...), well_id: str | None = None, formation: str | None = None, top_k: int = Query(5, ge=1, le=10),
):
    """Same retrieval as /search, plus an Ollama-synthesized cited paragraph when Ollama is reachable
    (falls back to plain hits otherwise -- see app/search.py::answer, untested-in-sandbox note there)."""
    return rag_answer(q, top_k=top_k, well_id=well_id, formation=formation)


class ExtractRequest(BaseModel):
    text: str
    use_llm_fallback: bool = False


@app.post("/extract", response_model=Extraction)
def extract_fields(req: ExtractRequest):
    """Pull event_type/depth/formation/mitigation out of a report excerpt. Regex-first; set
    use_llm_fallback=true to try Ollama when regex finds no event type (untested in this sandbox --
    see app/extract.py)."""
    return extract(req.text, use_llm_fallback=req.use_llm_fallback)


@app.get("/health")
def health():
    from .ocr import get_engine

    engine, reason = get_engine()
    return {"status": "ok", "ocr_engine": engine.name if engine else None, "ocr_note": reason or None}


@app.post("/parse", response_model=ParseResponse)
def parse(
    file: UploadFile = File(...),
    ocr: str = Query("auto", pattern="^(auto|force|off)$"),
    tables: bool = Query(True),
):
    """PDF in -> per-page text, tables, OCR flag and confidence, plus a WCR/DDR guess."""
    data = file.file.read()
    if len(data) > MAX_BYTES:
        raise HTTPException(413, "File too large (limit 50 MB)")
    if not data.startswith(b"%PDF"):
        raise HTTPException(400, "Not a PDF file")
    try:
        return parse_pdf(data, filename=file.filename, ocr=ocr, tables=tables)
    except Exception as e:  # noqa: BLE001
        raise HTTPException(422, f"Could not parse PDF: {e}")
