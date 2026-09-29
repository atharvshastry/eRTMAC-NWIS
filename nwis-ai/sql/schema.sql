-- NWIS (PS 26121) database schema.
--
-- This is the single source of truth the Python AI service (app/data.py's Store, once swapped from
-- CSV -- see that file's docstring) and the teammates' Fastify/Drizzle backend both read from PostGIS
-- gives "wells within X km" as a real distance query (ST_DWithin on a geography column, not a
-- Python haversine loop); pgvector stores the RAG embeddings next to the data they came from, so
-- there's no separate vector DB to run or keep in sync.
--
-- Column names and types follow data/schema.json and the CSVs in data/*.csv exactly, so
-- scripts/load_csv_data.sh can \copy them in unchanged. Requires Postgres with the postgis and
-- vector extensions available -- see docker/postgres/Dockerfile, which builds a Postgres 16 image
-- with both baked in for `docker compose up`.
--
-- NOTE ON SANDBOX TESTING: this exact file (with the two extensions) could not be executed in the
-- Claude sandbox this was written in -- it has a local Postgres 16 but no route to apt/pip to install
-- postgis or pgvector (see sql/README.md for what WAS verified there: table structure, foreign keys,
-- and the CSV loader, against a stripped-down copy of this schema). Run `psql -f sql/schema.sql` once
-- against a real postgis+vector-enabled Postgres before relying on the geography/vector features.

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================================================
-- Core: wells and their static attributes
-- ============================================================================================
CREATE TABLE wells (
    well_id               TEXT PRIMARY KEY,
    well_name             TEXT NOT NULL,
    field                 TEXT,
    asset                 TEXT,
    rig_name              TEXT,
    spud_date             DATE,
    rig_release_date      DATE,
    surface_lat           DOUBLE PRECISION NOT NULL,
    surface_lon           DOUBLE PRECISION NOT NULL,
    -- Generated so lat/lon stay the single source of truth; ST_DWithin/ST_Distance use this.
    geom                  GEOGRAPHY(Point, 4326)
                              GENERATED ALWAYS AS (
                                  ST_SetSRID(ST_MakePoint(surface_lon, surface_lat), 4326)::geography
                              ) STORED,
    kb_elev_m             DOUBLE PRECISION,
    ground_elev_m         DOUBLE PRECISION,
    planned_td_m          DOUBLE PRECISION,
    actual_td_m           DOUBLE PRECISION,
    well_type             TEXT,
    well_status           TEXT,
    current_hole_section  TEXT,
    data_status           TEXT NOT NULL CHECK (data_status IN ('HISTORICAL', 'ACTIVE'))
);
CREATE INDEX wells_geom_gix ON wells USING GIST (geom);
CREATE INDEX wells_field_idx ON wells (field);

-- ============================================================================================
-- Trajectory: survey stations (offset geometry, 3D well path)
-- ============================================================================================
CREATE TABLE trajectory (
    well_id           TEXT NOT NULL REFERENCES wells (well_id) ON DELETE CASCADE,
    md_m              DOUBLE PRECISION NOT NULL,
    tvd_m             DOUBLE PRECISION,
    inclination_deg   DOUBLE PRECISION,
    azimuth_deg       DOUBLE PRECISION,
    northing_m        DOUBLE PRECISION,
    easting_m         DOUBLE PRECISION,
    PRIMARY KEY (well_id, md_m)
);

-- ============================================================================================
-- Formation intervals by depth (correlates events to geological intervals)
-- ============================================================================================
CREATE TABLE formation_log (
    id                       BIGSERIAL PRIMARY KEY,
    well_id                  TEXT NOT NULL REFERENCES wells (well_id) ON DELETE CASCADE,
    formation                TEXT NOT NULL,
    top_md_m                 DOUBLE PRECISION NOT NULL,
    base_md_m                DOUBLE PRECISION NOT NULL,
    lithology                TEXT,
    reservoir_quality_index  DOUBLE PRECISION,
    formation_risk           TEXT,
    UNIQUE (well_id, formation, top_md_m)
);
CREATE INDEX formation_log_well_depth_idx ON formation_log (well_id, top_md_m, base_md_m);

-- ============================================================================================
-- Real-time / mud-logging telemetry (WITSML-style time/depth data)
-- ============================================================================================
CREATE TABLE ertmac_realtime (
    id              BIGSERIAL PRIMARY KEY,
    "timestamp"     TIMESTAMPTZ NOT NULL,
    well_id         TEXT NOT NULL REFERENCES wells (well_id) ON DELETE CASCADE,
    md_m            DOUBLE PRECISION,
    tvd_m           DOUBLE PRECISION,
    formation       TEXT,
    activity_phase  TEXT,
    rop_m_hr        DOUBLE PRECISION,
    wob_klbf        DOUBLE PRECISION,
    rpm             DOUBLE PRECISION,
    torque_kNm      DOUBLE PRECISION,
    spp_kPa         DOUBLE PRECISION,
    hookload_kN     DOUBLE PRECISION,
    flow_in_lpm     DOUBLE PRECISION,
    flow_out_pct    DOUBLE PRECISION,
    mud_weight_sg   DOUBLE PRECISION,
    pit_volume_bbl  DOUBLE PRECISION,
    ecd_sg          DOUBLE PRECISION,
    gamma_api       DOUBLE PRECISION,
    total_gas_pct   DOUBLE PRECISION,
    event_code      TEXT
);
CREATE INDEX ertmac_realtime_well_time_idx ON ertmac_realtime (well_id, "timestamp");
CREATE INDEX ertmac_realtime_well_md_idx ON ertmac_realtime (well_id, md_m);

-- ============================================================================================
-- Operational events: historical incidents and lessons learned (the risk engine's ground truth)
-- ============================================================================================
CREATE TABLE operational_events (
    event_id        TEXT PRIMARY KEY,
    well_id         TEXT NOT NULL REFERENCES wells (well_id) ON DELETE CASCADE,
    event_type      TEXT NOT NULL CHECK (
                        event_type IN ('MUD_LOSS', 'STUCK_PIPE', 'KICK', 'TORQUE_SPIKE',
                                       'CEMENTING_ISSUE', 'NPT')
                    ),
    severity        TEXT,
    depth_md_m      DOUBLE PRECISION NOT NULL,
    depth_tvd_m     DOUBLE PRECISION,
    start_time      TIMESTAMPTZ,
    end_time        TIMESTAMPTZ,
    formation       TEXT,   -- as logged by the reporter; app/data.py re-derives from formation_log
                             -- at query time because the two sometimes disagree (see its docstring)
    description     TEXT,
    mitigation      TEXT,
    npt_hours       DOUBLE PRECISION,
    record_status   TEXT
);
CREATE INDEX operational_events_well_depth_idx ON operational_events (well_id, depth_md_m);
CREATE INDEX operational_events_type_idx ON operational_events (event_type);

-- ============================================================================================
-- Daily drilling reports / well completion summaries
-- ============================================================================================
CREATE TABLE ddr_daily (
    ddr_id                  TEXT PRIMARY KEY,
    well_id                 TEXT NOT NULL REFERENCES wells (well_id) ON DELETE CASCADE,
    report_date             DATE,
    start_depth_m           DOUBLE PRECISION,
    end_depth_m             DOUBLE PRECISION,
    footage_m               DOUBLE PRECISION,
    primary_activity        TEXT,
    hole_section             TEXT,
    daily_drilling_hours    DOUBLE PRECISION,
    status                  TEXT,
    event_id                TEXT REFERENCES operational_events (event_id) ON DELETE SET NULL,
    reporting_engineer      TEXT,
    source_system           TEXT
);
CREATE INDEX ddr_daily_well_date_idx ON ddr_daily (well_id, report_date);

CREATE TABLE wcr_summary (
    wcr_id                        TEXT PRIMARY KEY,
    well_id                       TEXT NOT NULL UNIQUE REFERENCES wells (well_id) ON DELETE CASCADE,
    field                         TEXT,
    spud_date                     DATE,
    rig_release_date              DATE,
    planned_td_m                  DOUBLE PRECISION,
    actual_td_m                   DOUBLE PRECISION,
    event_count                   INTEGER,
    mud_loss_events               INTEGER,
    stuck_pipe_events             INTEGER,
    kick_events                   INTEGER,
    completion_data_confidence    DOUBLE PRECISION,
    summary_note                  TEXT
);

-- ============================================================================================
-- Mud, casing/cement, BHA/bit records
-- ============================================================================================
CREATE TABLE mud_report (
    mud_report_id           TEXT PRIMARY KEY,
    well_id                 TEXT NOT NULL REFERENCES wells (well_id) ON DELETE CASCADE,
    report_date             DATE,
    depth_md_m              DOUBLE PRECISION,
    mud_weight_sg           DOUBLE PRECISION,
    funnel_vis_s            DOUBLE PRECISION,
    plastic_vis_cP          DOUBLE PRECISION,
    yield_point_lb100ft2    DOUBLE PRECISION,
    filtration_ml_30min     DOUBLE PRECISION,
    chlorides_ppm           DOUBLE PRECISION,
    alkalinity_mEq          DOUBLE PRECISION,
    mud_system               TEXT,
    treatment                TEXT
);
CREATE INDEX mud_report_well_depth_idx ON mud_report (well_id, depth_md_m);

CREATE TABLE casing_cement (
    casing_job_id         TEXT PRIMARY KEY,
    well_id               TEXT NOT NULL REFERENCES wells (well_id) ON DELETE CASCADE,
    casing_size           TEXT,
    set_depth_m           DOUBLE PRECISION,
    grade                 TEXT,
    status                TEXT,
    cement_yield_ft3sk    DOUBLE PRECISION,
    slurry_volume_bbl     DOUBLE PRECISION,
    cement_result         TEXT
);

CREATE TABLE bha_bit (
    bha_id                     TEXT PRIMARY KEY,
    well_id                    TEXT NOT NULL REFERENCES wells (well_id) ON DELETE CASCADE,
    run_no                     INTEGER,
    bha_length_m               DOUBLE PRECISION,
    start_depth_m              DOUBLE PRECISION,
    bit_type                   TEXT,
    steering_system            TEXT,
    bit_hours                  DOUBLE PRECISION,
    bit_footage_m               DOUBLE PRECISION,
    drilling_efficiency_pct    DOUBLE PRECISION,
    performance_rating         TEXT
);

-- ============================================================================================
-- Document inventory + extraction provenance. `documents` tracks every uploaded WCR/DDR/etc.;
-- `extracted_fields` stores what app/extract.py pulled out of it, WITH the character span into the
-- source text, so a reviewer (or the UI) can jump straight to the evidence -- this is what makes
-- alerts "evidence-backed" rather than a black-box score (see tech-stack.md design principle #1).
-- ============================================================================================
CREATE TABLE documents (
    document_id        TEXT PRIMARY KEY,
    well_id             TEXT REFERENCES wells (well_id) ON DELETE CASCADE,
    document_type       TEXT,     -- 'WCR' | 'DDR' | ...
    file_format         TEXT,
    file_name            TEXT,
    storage_path         TEXT,     -- where the uploaded PDF lives (object storage / disk path)
    parse_status         TEXT DEFAULT 'PENDING' CHECK (
                              parse_status IN ('PENDING', 'PARSED', 'FAILED')
                          ),
    ocr_used              BOOLEAN,
    doc_type_guess        TEXT,     -- app/parser.py's guess_doc_type() output
    extraction_note       TEXT,
    availability          TEXT,
    uploaded_at            TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX documents_well_idx ON documents (well_id);

CREATE TABLE extracted_fields (
    id                BIGSERIAL PRIMARY KEY,
    document_id        TEXT REFERENCES documents (document_id) ON DELETE CASCADE,
    page               INTEGER,
    event_type          TEXT,
    depth_m             DOUBLE PRECISION,
    formation           TEXT,
    mitigation          TEXT,
    method              TEXT CHECK (method IN ('regex', 'llm')),
    confidence          DOUBLE PRECISION,
    span_start          INTEGER,   -- character offsets into the source page text
    span_end            INTEGER,
    source_snippet      TEXT,
    reviewed            BOOLEAN DEFAULT FALSE,   -- a human confirmed/corrected this extraction
    created_at          TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX extracted_fields_document_idx ON extracted_fields (document_id);

-- ============================================================================================
-- NLP / RAG source text: the searchable knowledge repository (PS 26121 requirement iii).
-- embedding is nullable so rows can be inserted before the embedding job runs; ivfflat needs
-- `analyze` after it's populated with real data (see sql/README.md).
-- ============================================================================================
CREATE TABLE nlp_source_text (
    text_id                TEXT PRIMARY KEY,
    well_id                TEXT REFERENCES wells (well_id) ON DELETE CASCADE,
    source_document_type   TEXT,
    reference_depth_m      DOUBLE PRECISION,
    formation              TEXT,
    text                   TEXT NOT NULL,
    gold_event_type        TEXT,
    language               TEXT,
    text_search            TSVECTOR GENERATED ALWAYS AS (to_tsvector('english', text)) STORED,
    embedding              VECTOR(384)   -- bge-small-en-v1.5 dimensionality; see app/search.py
                                          -- for the interim TF-IDF retrieval used until a real
                                          -- embedding model is wired up (no network for it in the
                                          -- sandbox this was built in -- see that file's docstring)
);
CREATE INDEX nlp_source_text_fts_idx ON nlp_source_text USING GIN (text_search);
-- Build this once the table has real rows (ivfflat needs data to pick good list count from):
--   CREATE INDEX nlp_source_text_embedding_idx ON nlp_source_text
--     USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ============================================================================================
-- Supervised-learning targets and offset relevance (stretch: Random Forest + SHAP per tech-stack.md)
-- ============================================================================================
CREATE TABLE risk_labels (
    event_id            TEXT NOT NULL REFERENCES operational_events (event_id) ON DELETE CASCADE,
    well_id              TEXT NOT NULL REFERENCES wells (well_id) ON DELETE CASCADE,
    reference_depth_m    DOUBLE PRECISION,
    formation            TEXT,
    event_type           TEXT,
    horizon_m            DOUBLE PRECISION NOT NULL,
    risk_label           INTEGER NOT NULL,
    label_definition     TEXT,
    PRIMARY KEY (event_id, horizon_m)
);

CREATE TABLE offset_relations (
    active_well_id       TEXT NOT NULL REFERENCES wells (well_id) ON DELETE CASCADE,
    offset_well_id       TEXT NOT NULL REFERENCES wells (well_id) ON DELETE CASCADE,
    surface_distance_km  DOUBLE PRECISION,
    same_field           BOOLEAN,
    common_formations    TEXT,
    relevance_score      DOUBLE PRECISION,
    relevance_band       TEXT,
    PRIMARY KEY (active_well_id, offset_well_id)
);

-- ============================================================================================
-- Calibrated risk-alert thresholds (app/calibrate.py's output), persisted so the Node API can read
-- them without calling back into the Python service on every request. Re-populated whenever
-- scripts/run_calibration.py is re-run (see that script and app/README.md's "honest finding" note).
-- ============================================================================================
CREATE TABLE risk_thresholds (
    event_type      TEXT NOT NULL,
    band            TEXT NOT NULL CHECK (band IN ('LOW', 'MEDIUM', 'HIGH')),
    min_freq        DOUBLE PRECISION NOT NULL,
    min_wells       INTEGER NOT NULL,
    calibrated_at   TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (event_type, band)
);
