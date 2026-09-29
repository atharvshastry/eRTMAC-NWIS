#!/usr/bin/env bash
# Loads the synthetic dataset in data/*.csv into a Postgres database that already has sql/schema.sql
# applied. FK-safe order: wells first, then everything that references wells, then everything that
# references operational_events.
#
#   psql -f sql/schema.sql "$DATABASE_URL"
#   scripts/load_csv_data.sh "$DATABASE_URL"          # defaults to postgres://postgres@localhost/nwis
#
# Uses \copy (client-side), so it works from wherever this repo is checked out -- the server doesn't
# need filesystem access to data/. Every table is TRUNCATEd first, so this is safe to re-run.
set -euo pipefail

DB_URL="${1:-postgres://postgres@localhost/nwis}"
# Override with DATA_DIR=/some/path for a container where the repo layout differs (see docker-compose.yml).
DATA_DIR="${DATA_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/data}"

# well_id + operational_events(event_id) FK targets must load before anything that references them.
TABLES=(
  wells
  trajectory
  formation_log
  ertmac_realtime
  operational_events
  ddr_daily
  wcr_summary
  mud_report
  casing_cement
  bha_bit
  documents
  nlp_source_text
  risk_labels
  offset_relations
)

echo "Loading into: $DB_URL"
for t in "${TABLES[@]}"; do
  csv="$DATA_DIR/$t.csv"
  if [[ ! -f "$csv" ]]; then
    echo "skip  $t (no $csv)"
    continue
  fi
  cols=$(head -1 "$csv")
  psql "$DB_URL" -v ON_ERROR_STOP=1 -c "TRUNCATE TABLE $t CASCADE;" >/dev/null
  psql "$DB_URL" -v ON_ERROR_STOP=1 -c "\\copy $t ($cols) FROM '$csv' WITH (FORMAT csv, HEADER true)"
  n=$(psql "$DB_URL" -t -c "SELECT count(*) FROM $t;" | tr -d ' ')
  echo "ok    $t: $n rows"
done
