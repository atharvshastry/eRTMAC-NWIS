# NWIS AI service

PS 26121 (eRTMAC-NWIS, Oil India Limited). This is the Python AI service: PDF/OCR parsing (Stage 1),
the offset-well risk engine (Stage 2), field extraction (Stage 3), hybrid knowledge search (Stage 4)
and the database schema (Stage 5). It runs as a standalone FastAPI service alongside the teammates'
React frontend and Fastify/Node backend -- see **"Talking to this service"** at the bottom for the
API contract they integrate against.

## Setup
```bash
python -m venv .venv && source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt                        # now includes pandas + scikit-learn (Stage 2/4 need them)
pip install paddlepaddle paddleocr                      # preferred OCR (CPU). Fallback: pip install pytesseract + install Tesseract
python scripts/check_ocr.py                             # tells you which OCR engine works on this machine
```

Or with Docker (also brings up Postgres with PostGIS + pgvector, and loads the dataset into it):
```bash
docker compose up --build
```

## Run
```bash
uvicorn app.main:app --port 8001 --reload              # POST /parse (multipart 'file'), GET /health, docs at /docs
python scripts/parse_folder.py path/to/pdfs --out parsed   # batch: one JSON per PDF + a summary line
python scripts/make_sample_ddr.py                      # fake DDR (digital + degraded scan) for testing
python -m pytest -q
```

`POST /parse?ocr=auto|force|off&tables=true` returns the shape in `app/schemas.py`
(`pages[].text`, `pages[].tables`, `ocr_used`, `confidence`, `doc_type_guess`, `warnings`).
Env var `NWIS_OCR=paddle|tesseract|none` forces an engine.

## Known limits (be upfront about these)
- OCR pages return text only, no tables. Ruled table cells on scans OCR poorly (seen with Tesseract on a degraded fake scan).
- Doc type guess is keyword-based; tune the keyword lists in `app/parser.py` once real WCR/DDR titles are known.
- PaddleOCR adapter handles both 2.x and 3.x APIs but was written without running Paddle; run `check_ocr.py` first.

## Stage 2: risk engine (offset-well alerts) — `app/risk.py`, `app/data.py`

Loads the CSV dataset in `data/` (swap for Postgres/PostGIS later — see `app/data.py`) and answers,
for an active well at a given depth, which incident types nearby historical wells hit in the depth
window ahead, with full evidence (which wells, which events, source description/mitigation).

```bash
python -m pytest tests/test_risk.py -q
python scripts/run_calibration.py          # per-event-type threshold calibration + backtest report
```

`GET /risk/assess?well_id=OIL-SYN-ACTIVE-01&depth_md_m=2200` — live alert for a well/depth.
`GET /risk/thresholds` — the calibrated thresholds currently in effect.

### Honest finding from backtesting (`app/backtest.py`, `app/calibrate.py`)

This dataset has 54 incidents spread across 18 historical wells (~3 events/well, 9 per type). A
leave-one-well-out backtest against a shuffled-depth control shows:

- **LOW tier ("worth flagging")**: real recall ~0.63 vs a ~0.23 random-shuffle baseline — genuine,
  above-chance signal.
- **MEDIUM/HIGH tiers**: do NOT clearly beat the shuffled control on this dataset — there isn't enough
  data per incident type to support a high-confidence claim yet.

This is worth saying plainly to judges: the system surfaces real historical evidence and an honest
"worth a look" signal, but treat MEDIUM/HIGH as illustrative until backtested on more data. That's a
more defensible SIH story than claiming validated high-confidence risk scores on 54 synthetic events.
Re-run `scripts/run_calibration.py` when your friend's dataset grows or real data arrives.

## Data

`data/` holds the synthetic dataset your teammate provided (19 wells incl. 1 active, telemetry, DDR/WCR/
mud/casing/BHA/trajectory/formation tables, operational events, risk labels, offset relations, NLP
source text). It is explicitly synthetic (see `data/README_dataset.txt`), aligned to OIL's public
eRTMAC/WITSML/OpenWells documentation, not a real OIL extract.

## Stage 3: extraction — `app/extract.py`

Regex-first extraction of event_type, depth_m, formation and mitigation, validated against this
dataset's ground truth:

```bash
python -m pytest tests/test_extract.py -q -s
```

- **8/8** correct on `data/nlp_source_text.csv` (the labelled gold set) -- note these 8 rows are all
  the same template with values swapped in, so this mainly confirms the regex is wired correctly.
- **54/54** correct on `data/operational_events.csv` descriptions (different, shorter phrasing) -- a
  stronger check, and it caught a real gap (the NPT pattern didn't match its own description text).

`POST /extract {"text": "..."}` returns fields with character spans into the source text, so a UI can
highlight exactly where each value came from -- store this alongside the source page/snippet per the
provenance approach agreed in the tech stack doc.

**Known gap:** all ground truth here is synthetic and formulaic. Real WCR/DDR prose will be messier.
`extract_llm()` (Ollama) is written as the fallback path for that but is untested in this sandbox --
no outbound network access to a model server here. Test it against real or more varied text before
relying on it, and treat every extraction as reviewable (spans exist for exactly this reason).

## Stage 4: knowledge search / RAG — `app/search.py`

The "searchable knowledge repository" requirement: hybrid search over historical incidents and
extracted report text, every hit citing a real `event_id`/`text_id` so nothing is invented.

```bash
python -m pytest tests/test_search.py -q -s
```

`GET /search?q=mud+loss+near+2800m&well_id=...&formation=...&event_type=...` — ranked hits with
scores and source citations.
`GET /search/answer?q=...` — same retrieval, plus an Ollama-synthesized cited paragraph when Ollama
is reachable (degrades to plain hits when it isn't — never fabricates an answer with no retrieval).

Retrieval is TF-IDF cosine + exact-match, not the bge-small-en-v1.5 embeddings in the original
tech-stack plan — this sandbox had no route to huggingface.co to download that model, so a fully
working, tested-here fallback was built instead of untested dead code for the real one. It works
better than a naive bag-of-words score because the indexed text is prefixed with the human-readable
event-type label (see `_event_text()`), which bridges cases where the report text says "formation
influx" but an engineer searches "kick" — locked in by
`tests/test_search.py::test_event_type_label_bridges_vocabulary_gap`. Swap point for real embeddings
is `build_corpus()`/`search()`'s vectorizer — same query-vector/cosine-similarity/top-k interface,
so nothing downstream has to change.

## Stage 5: database — `sql/schema.sql`

Postgres + PostGIS + pgvector schema matching `data/schema.json` exactly — the contract this service
and the teammates' Fastify/Drizzle backend both read from. `docker compose up` builds a postgis+
pgvector Postgres image, applies the schema, and loads `data/*.csv` into it automatically. See
`sql/README.md` for exactly what was and wasn't verified in this sandbox (no route to install
postgis/pgvector there, so the schema + CSV loader were verified against a stripped-down local copy —
full detail and honest caveats in that file).

The Python `Store` (`app/data.py`) still reads the CSVs directly rather than this database — that's a
documented, deliberate swap point (see that file's docstring), not done in this pass because there
was no live postgis+pgvector Postgres available here to test a DB-backed rewrite against. The schema
and loader are ready for whoever picks that up next (Node backend can start against it today).

## Talking to this service (for the Node/React team)

Base URL: `http://localhost:8001` (or `http://doc-worker:8001` from inside docker-compose). Every
endpoint returns JSON; errors are `{"detail": "..."}` with a 4xx/5xx status. Interactive docs at
`/docs` once the service is running (FastAPI auto-generates these from `app/schemas.py`/the route
signatures — handy for exploring response shapes live instead of trusting this table blindly).

| Endpoint | Method | Purpose |
|---|---|---|
| `/health` | GET | Service + OCR engine status |
| `/parse` | POST (multipart `file`) | PDF → pages, text, tables, OCR flag, WCR/DDR guess |
| `/extract` | POST `{"text": "..."}` | Pull event_type/depth/formation/mitigation from report text, with char spans |
| `/risk/assess` | GET `?well_id=&depth_md_m=` | Offset-well risk alerts for the next `lookahead_m` (default 150m) below `depth_md_m`, each with cited evidence |
| `/risk/thresholds` | GET | Currently-calibrated per-event-type alert thresholds |
| `/wells` | GET `?field=&data_status=` | All wells (location, status, TD) — for the map |
| `/wells/{well_id}` | GET | One well's full record |
| `/wells/nearby` | GET `?well_id=&radius_km=` | Historical wells within radius, nearest first |
| `/search` | GET `?q=&well_id=&formation=&event_type=` | Hybrid search over incidents/report text, cited hits |
| `/search/answer` | GET `?q=&well_id=&formation=` | Same, plus an LLM-synthesized cited answer (degrades gracefully if Ollama's down) |

Notes for integration:
- Depths are always metres MD (`depth_md_m`), matching `data/schema.json`.
- `/risk/assess` and `/search` are read-only and safe to poll from the frontend as the simulated
  eRTMAC depth feed advances (see tech-stack.md's "Simulated eRTMAC feed + Socket.io" — that live
  feed/Socket.io layer is the Node side's job; this service is stateless per request).
- Every alert/search hit carries the real source record id (`event_id` or `text_id`) — use that to
  link back into the UI's evidence view rather than re-deriving anything from the message text.
