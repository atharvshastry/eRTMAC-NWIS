# Postgres 16 with both PostGIS (wells-within-radius queries) and pgvector (RAG embeddings) --
# neither the plain postgres image nor the postgis/postgis image ships both. pgvector/pgvector:pg16
# already builds pgvector against this exact Postgres version, so we only need to add PostGIS on top.
#
# NOT buildable in the sandbox this was written in (no route to Docker Hub or apt mirrors there --
# see sql/README.md for what WAS verified: the schema and CSV loader against a plain local Postgres).
# Build and run this on a machine with normal internet access:
#   docker compose up postgres
FROM pgvector/pgvector:pg16

RUN apt-get update \
    && apt-get install -y --no-install-recommends postgresql-16-postgis-3 postgresql-16-postgis-3-scripts \
    && rm -rf /var/lib/apt/lists/*
