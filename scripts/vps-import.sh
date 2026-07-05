#!/usr/bin/env bash
# Corre scripts de import/enrich na VPS quando o Postgres só está acessível
# dentro da rede Docker (sem porta 5432 publicada no host).
#
# Uso:
#   ./scripts/vps-import.sh import-na-auto.mjs --limit=500
#   ./scripts/vps-import.sh import-na-moto.mjs --limit=150
#   ./scripts/vps-import.sh enrich-products.mjs -- --supplier=neumaticos_andres
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

SCRIPT="${1:?Informe o script (ex: import-na-auto.mjs)}"
shift || true

# Carrega credenciais do .env / .env.local para o container
ENV_ARGS=()
for f in .env .env.local; do
  [[ -f "$f" ]] && ENV_ARGS+=(--env-file "$f")
done

# Sobrescreve DATABASE_URL — dentro da rede Docker o host é "postgres", não localhost
ENV_ARGS+=(-e "DATABASE_URL=postgresql://mecanidoc:mecanidoc@postgres:5432/mecanidoc")

echo "→ VPS import via rede Docker (postgres:5432)"
echo "→ node scripts/$SCRIPT $*"
echo ""

docker compose run --rm \
  "${ENV_ARGS[@]}" \
  -v "$ROOT:/workspace" \
  -w /workspace \
  --entrypoint node \
  node:20-alpine \
  "scripts/$SCRIPT" "$@"
