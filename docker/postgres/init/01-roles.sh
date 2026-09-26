#!/bin/bash
# Papéis PostgreSQL da aplicação (executado pelo entrypoint oficial em bases novas).
#
#   mecanidoc_app   — LOGIN, sem privilégios especiais. É o utilizador de DATABASE_URL
#                     da aplicação. Não é dono das tabelas ⇒ RLS aplica-se sempre.
#   mecanidoc_admin — NOLOGIN, BYPASSRLS. A app faz `SET LOCAL ROLE mecanidoc_admin`
#                     apenas nas operações de servidor (login, checkout, webhooks, cron).
#
# O superutilizador POSTGRES_USER fica reservado a migrações / init.
#
# Para uma base já existente: `bash scripts/db-harden.sh` (ver README).
set -euo pipefail

: "${MECANIDOC_APP_DB_PASSWORD:?Defina MECANIDOC_APP_DB_PASSWORD (password do papel mecanidoc_app)}"

# Escapar aspas simples para o literal SQL.
APP_PW_SQL=$(printf "%s" "$MECANIDOC_APP_DB_PASSWORD" | sed "s/'/''/g")

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<EOSQL
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
GRANT CONNECT ON DATABASE "$POSTGRES_DB" TO mecanidoc_app, mecanidoc_admin;
EOSQL
