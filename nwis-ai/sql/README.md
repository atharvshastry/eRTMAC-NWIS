# Database

`schema.sql` is the schema for Postgres + PostGIS + pgvector -- the single source of truth for both
this Python AI service and the teammates' Fastify/Drizzle backend (see docker-compose.yml). Column
names/types mirror `data/schema.json` and the CSVs in `data/` exactly.

## Bring it up

```bash
docker compose up --build          # builds postgres (with postgis+pgvector), applies schema.sql,
                                    # loads data/*.csv, starts the AI service on :8001
```

Or manually against any Postgres that already has `postgis` and `vector` extensions installed:

```bash
psql -f sql/schema.sql "$DATABASE_URL"
scripts/load_csv_data.sh "$DATABASE_URL"
```

## What was actually verified, and how

The sandbox this was built in has a local Postgres 16 but no route to apt/pip/Docker Hub to install
`postgis` or `pgvector` (or even reach them to confirm -- `apt-get install postgresql-16-postgis-3`
came back `403 Forbidden`). So the two extension-specific pieces (the generated `geography` column on
`wells`, the `vector(384)` column on `nlp_source_text`) could not be executed there. Everything else
was:

- **Schema applies cleanly.** All 16 tables + indexes were created from a copy of this file with only
  the two extension-dependent bits swapped out (`CREATE EXTENSION` lines removed, the generated
  geography column and vector column dropped -- `wells.surface_lat/lon` and the CSV loader itself are
  unaffected, since neither depends on those columns).
- **The full CSV loader ran end-to-end with zero errors**, in FK-safe order, and every row count
  matched `data/README_dataset.txt`'s stated scale exactly: 19 wells, 263 trajectory stations, 93
  formation intervals, 3100 telemetry rows, 54 events, 118 DDRs, 19 WCRs, 95 mud reports, 57 casing
  jobs, 39 BHA runs, 57 documents, 8 NLP source texts, 162 risk labels, 18 offset relations.
- **Foreign-key integrity holds**: zero orphaned rows when joining `operational_events`/
  `ertmac_realtime` back to `wells`.
- **Full-text search works** (`nlp_source_text.text_search`, built-in `tsvector` -- no extension
  needed): `plainto_tsquery('english', 'mud loss')` correctly finds the one NLP-source row that
  mentions it.

**Still to verify on a machine with real network access**, before trusting this in the pipeline:

1. `docker compose up --build` actually builds (Dockerfiles are hand-written, not executed here).
2. The generated `geom GEOGRAPHY(Point,4326)` column and `ST_DWithin`/`ST_Distance` queries against
   it -- these should reproduce `app/data.py::haversine_km` (already tested, matches known distances)
   but on the real geography type, not a Python approximation.
3. The `vector(384)` column and an `ivfflat` index once it's actually populated by an embedding job
   (there is no embedding job yet -- `app/search.py` uses TF-IDF for now; see that file's docstring
   for the swap point to real `bge-small-en-v1.5` embeddings once you have network to download it).

## Swapping the Python risk engine onto this database

`app/data.py`'s `Store` class currently loads `data/*.csv` (documented as a deliberate "swap point" in
its own docstring). Nothing in `app/risk.py`, `app/calibrate.py` or `app/backtest.py` needs to change
when you swap it -- they only call `Store`'s methods (`wells`, `events`, `nearby()`, `formation_at()`,
`telemetry()`). Rewiring `Store.__init__` to query this schema instead of CSVs is the next step if the
Python service needs to read live data rather than the synthetic set; not done yet in this pass since
there's no way to test a DB-backed rewrite without a running postgis+pgvector Postgres.
