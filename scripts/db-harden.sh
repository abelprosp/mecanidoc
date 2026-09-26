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

echo "→ 2/3 esquema de segurança"
run_psql_file docker/postgres/init/05-support.sql
run_psql_file docker/postgres/init/06-security.sql

echo "→ 3/3 permissões"
run_psql_file docker/postgres/init/99-grants.sql

echo ""
echo "Concluído. Verifique com:"
echo "  docker compose exec $SERVICE psql -U $PGUSER_SUPER -d $PGDB -c \"select rolname, rolsuper, rolbypassrls from pg_roles where rolname like 'mecanidoc%'\""
echo "Reinicie a app para usar o novo utilizador: docker compose up -d --force-recreate app"
