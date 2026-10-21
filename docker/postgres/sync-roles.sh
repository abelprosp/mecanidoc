#!/bin/bash
# Sincroniza mecanidoc_app / mecanidoc_admin numa base JÁ existente.
# Corre em todo `docker compose up` (serviço db-roles) e em scripts/db-harden.sh.
set -euo pipefail

: "${MECANIDOC_APP_DB_PASSWORD:?Defina MECANIDOC_APP_DB_PASSWORD}"
export PGUSER="${POSTGRES_USER:-${PGUSER:-mecanidoc}}"
export PGDATABASE="${POSTGRES_DB:-${PGDATABASE:-mecanidoc}}"
export PGHOST="${PGHOST:-localhost}"
export PGPORT="${PGPORT:-5432}"
# Superuser password: PGPASSWORD já deve estar no ambiente (POSTGRES_PASSWORD).

APP_PW_SQL=$(printf "%s" "$MECANIDOC_APP_DB_PASSWORD" | sed "s/'/''/g")

for i in $(seq 1 40); do
  if psql -v ON_ERROR_STOP=1 -c 'select 1' >/dev/null 2>&1; then
    break
  fi
  echo "A aguardar PostgreSQL ($i/40)…"
  sleep 1
done

psql -v ON_ERROR_STOP=1 <<EOSQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mecanidoc_admin') THEN
    CREATE ROLE mecanidoc_admin NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE BYPASSRLS;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mecanidoc_app') THEN
    CREATE ROLE mecanidoc_app LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
  END IF;
END
\$\$;
ALTER ROLE mecanidoc_app PASSWORD '${APP_PW_SQL}';
ALTER ROLE mecanidoc_app SET statement_timeout = '30s';
GRANT mecanidoc_admin TO mecanidoc_app;
GRANT CONNECT ON DATABASE "${PGDATABASE}" TO mecanidoc_app, mecanidoc_admin;
EOSQL

echo "Papel mecanidoc_app sincronizado (password = MECANIDOC_APP_DB_PASSWORD do .env)."
