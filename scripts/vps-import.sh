#!/usr/bin/env bash
# Corre scripts de import/enrich na VPS quando o Postgres só está acessível
# dentro da rede Docker (sem porta 5432 publicada no host).
#
# Uso:
#   ./scripts/vps-import.sh import-na-auto.mjs --limit=500
#   npm run import:na-auto:vps -- --limit=500
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

SCRIPT="${1:?Informe o script (ex: import-na-auto.mjs)}"
shift || true

# Rede Docker do projeto (onde o container "postgres" é acessível)
NETWORK=""
if cid=$(docker compose ps -q postgres 2>/dev/null) && [[ -n "$cid" ]]; then
  NETWORK=$(docker inspect "$cid" -f '{{range $k,$v := .NetworkSettings.Networks}}{{$k}}{{end}}')
elif docker inspect mecanidoc-postgres &>/dev/null; then
  NETWORK=$(docker inspect mecanidoc-postgres -f '{{range $k,$v := .NetworkSettings.Networks}}{{$k}}{{end}}')
fi

if [[ -z "$NETWORK" ]]; then
  echo "Erro: não encontrei a rede Docker do Postgres. Confirme: docker compose ps" >&2
  exit 1
fi

# Variáveis do .env / .env.local
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

echo "→ VPS import | rede: $NETWORK | postgres:5432"
echo "→ node scripts/$SCRIPT $*"
echo ""

docker run --rm \
  --network "$NETWORK" \
  "${ENV_ARGS[@]}" \
  -v "$ROOT:/workspace" \
  -w /workspace \
  node:20-alpine \
  node "scripts/$SCRIPT" "$@"
