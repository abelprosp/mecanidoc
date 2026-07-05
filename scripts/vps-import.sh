#!/usr/bin/env bash
# Corre scripts de import/enrich na VPS quando o Postgres só está acessível
# dentro da rede Docker (sem porta 5432 publicada no host).
#
# Uso:
#   ./scripts/vps-import.sh import-na-auto.mjs --limit=500
#   ./scripts/vps-import.sh import-na-moto.mjs --limit=150
#   ./scripts/vps-import.sh enrich-products.mjs --supplier=neumaticos_andres
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

SCRIPT="${1:?Informe o script (ex: import-na-auto.mjs)}"
shift || true

COMPOSE_FILES=(-f docker-compose.yml)
[[ -f docker-compose.import.yml ]] && COMPOSE_FILES+=(-f docker-compose.import.yml)

echo "→ VPS import via rede Docker (postgres:5432)"
echo "→ node scripts/$SCRIPT $*"
echo ""

# Serviço "import" com env_file no compose (compatível com docker compose antigo)
if [[ -f docker-compose.import.yml ]]; then
  docker compose "${COMPOSE_FILES[@]}" --profile tools run --rm \
    --entrypoint node \
    import \
    "scripts/$SCRIPT" "$@"
  exit 0
fi

# Fallback: lê .env manualmente e passa cada variável com -e
ENV_ARGS=(-e "DATABASE_URL=postgresql://mecanidoc:mecanidoc@postgres:5432/mecanidoc")
for f in .env .env.local; do
  [[ -f "$f" ]] || continue
  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line%%#*}"
    line="$(echo "$line" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"
    [[ -z "$line" || "$line" != *"="* ]] && continue
    key="${line%%=*}"
    val="${line#*=}"
    key="$(echo "$key" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"
    [[ "$key" == "DATABASE_URL" ]] && continue
    val="${val%\"}"; val="${val#\"}"
    val="${val%\'}"; val="${val#\'}"
    ENV_ARGS+=(-e "${key}=${val}")
  done < "$f"
done

docker compose run --rm \
  "${ENV_ARGS[@]}" \
  -v "$ROOT:/workspace" \
  -w /workspace \
  --entrypoint node \
  node:20-alpine \
  "scripts/$SCRIPT" "$@"
