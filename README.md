# eRTMAC-NWIS — Nearby Wells Intelligence System

Smart India Hackathon prototype for PS 26121 (Oil India Limited): an offset-well risk assistant that
turns historical drilling reports and nearby-well events into live, evidence-backed alerts for an
active well, plus a document ingestion pipeline for OCR/extraction from PDF reports.

## Repo layout

- **`nwis-ai/`** — Python AI/ML service (FastAPI). PDF/OCR parsing, the offset-well risk engine, field
  extraction, hybrid search, and the Postgres/PostGIS schema. See `nwis-ai/README.md` for the full
  design writeup and API contract.
- **`backend/`** — Node/Fastify API. Reads the same CSV dataset the Python service uses (no Postgres
  required for the demo), proxies the ML-heavy work (risk scoring, search, PDF parsing) to the Python
  service over HTTP, and runs a simulated live-drilling feed.
- **`frontend/`** — React (Vite) UI.

## Prerequisites

- Python 3.11+ with a virtual environment for `nwis-ai/` (see `nwis-ai/requirements.txt`)
- Node.js 18+ for `backend/` and `frontend/`

## First-time setup

1. `nwis-ai/` — create/activate a virtualenv, then `pip install -r requirements.txt`.
2. `backend/` — copy `.env.example` to `.env` and fill in the values (defaults work as-is for local
   dev — see comments in the file).
3. `frontend/` — copy `.env.example` to `.env` (no editing needed for local dev:
   `VITE_API_BASE_URL=http://localhost:5002/api`).
4. `backend/` and `frontend/` — run `npm install` in each.

## Running the three services

Each runs in its own terminal, in this order:

```bash
# Terminal 1 — Python AI service
cd nwis-ai
uvicorn app.main:app --port 8001 --reload

# Terminal 2 — Node backend
cd backend
npm run dev
# listens on http://localhost:5002 — check /health to confirm it can see the AI service

# Terminal 3 — React frontend
cd frontend
npm run dev
# Vite prints a local URL, normally http://localhost:5173
```

Open the frontend URL and sign in with a demo account: username `Oil001` (through `Oil009`), password
`890890`. Login is entirely client-side (no backend call), so it works even before the other two
services are up.

## Known gaps (see `nwis-ai/README.md` and inline code comments for the full list)

- The Dashboard page is intentionally still on mock data.
- Document entity extraction fills 5 of the UI's 9 display categories; the rest are honestly left
  empty rather than fabricated.
- The risk model's MEDIUM/HIGH alert tiers are illustrative, not yet validated on enough data — only
  the LOW tier has been backtested to clearly beat a random-shuffle baseline.
- Postgres/PostGIS is not used by the running prototype (the CSV-backed path is what's wired up); the
  schema and loader in `nwis-ai/sql/` are a documented upgrade path, not required to run the demo.
