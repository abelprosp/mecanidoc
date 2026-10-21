#!/usr/bin/env bash
# Aplica o endurecimento de segurança a uma base PostgreSQL JÁ EXISTENTE
# (os scripts em docker/postgres/init só correm automaticamente em volumes novos).
#
#   1. Cria os papéis mecanidoc_app / mecanidoc_admin (01-roles.sh)
#   2. Aplica RLS, triggers e colunas novas (06-security.sql)
#   3. Reaplica permissões (99-grants.sql)
#
# Uso (na VPS, na raiz do projeto, com MECANIDOC_APP_DB_PASSWORD no .env ou no shell):
#   bash scripts/db-harden.sh
#
# Depois: DATABASE_URL da app deve passar a usar mecanidoc_app (ver docker-compose.yml)
# e o serviço app deve ser reiniciado: docker compose up -d --force-recreate app
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# Carregar .env para obter MECANIDOC_APP_DB_PASSWORD se não vier do shell
if [[ -z "${MECANIDOC_APP_DB_PASSWORD:-}" && -f .env ]]; then
  val=$(grep -E '^MECANIDOC_APP_DB_PASSWORD=' .env | tail -1 | cut -d= -f2- || true)
  val="${val%\"}"; val="${val#\"}"; val="${val%\'}"; val="${val#\'}"
  export MECANIDOC_APP_DB_PASSWORD="$val"
fi
: "${MECANIDOC_APP_DB_PASSWORD:?Defina MECANIDOC_APP_DB_PASSWORD (no .env ou no shell)}"

SERVICE="${POSTGRES_SERVICE:-postgres}"
PGUSER_SUPER="${POSTGRES_USER:-mecanidoc}"
PGDB="${POSTGRES_DB:-mecanidoc}"

run_psql_file() {
  local file="$1"
  echo "→ psql -f $file"
  docker compose exec -T -e PGOPTIONS="-c client_min_messages=warning" "$SERVICE" \
    psql -v ON_ERROR_STOP=1 -U "$PGUSER_SUPER" -d "$PGDB" < "$file"
}

echo "→ 1/3 papéis"
docker compose exec -T \
  -e MECANIDOC_APP_DB_PASSWORD="$MECANIDOC_APP_DB_PASSWORD" \
  -e POSTGRES_USER="$PGUSER_SUPER" \
  -e POSTGRES_DB="$PGDB" \
  "$SERVICE" bash -s < docker/postgres/init/01-roles.sh

echo "→ 2/4 esquema de segurança"
# Volume antigo pode não ter tabelas criadas depois do primeiro init.
# Criar antes de 06-security.sql (o ALTER TABLE falha se a relação não existir).
docker compose exec -T "$SERVICE" psql -v ON_ERROR_STOP=1 -U "$PGUSER_SUPER" -d "$PGDB" <<'SQL'
create table if not exists public.stripe_webhook_events (
  id text primary key,
  type text not null,
  processed_at timestamptz default timezone('utc'::text, now()) not null
);
create index if not exists idx_stripe_webhook_events_processed_at
  on public.stripe_webhook_events(processed_at);

-- Colunas que o login lê (06-security.sql antigo podia falhar antes de as criar).
alter table public.users add column if not exists session_version integer not null default 1;
alter table public.users add column if not exists mfa_enabled boolean not null default false;
alter table public.users add column if not exists mfa_secret_enc text;
alter table public.users add column if not exists mfa_recovery_hashes text[] not null default '{}';
alter table public.users add column if not exists mfa_enabled_at timestamptz;
alter table public.users add column if not exists password_changed_at timestamptz;
SQL
run_psql_file docker/postgres/init/05-support.sql
run_psql_file docker/postgres/init/06-security.sql
run_psql_file docker/postgres/init/07-garage-agenda.sql

echo "→ 3/4 permissões"
run_psql_file docker/postgres/init/99-grants.sql

echo ""
echo "Concluído. Verifique com:"
echo "  docker compose exec $SERVICE psql -U $PGUSER_SUPER -d $PGDB -c \"select rolname, rolsuper, rolbypassrls from pg_roles where rolname like 'mecanidoc%'\""
echo "Reinicie a app: docker compose up -d --force-recreate db-roles app"
echo "Login do SITE = e-mail/senha de um utilizador em public.users (ex. seed:master-admin)."
echo "Login da BASE = MECANIDOC_APP_DB_PASSWORD (nunca se escreve no formulário do site)."
