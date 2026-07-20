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
# Propagar overrides do shell (ex.: MASTER_ADMIN_EMAIL=... npm run seed:master-admin:vps)
for key in MASTER_ADMIN_EMAIL MASTER_ADMIN_PASSWORD MASTER_ADMIN_NAME; do
  if [[ -n "${!key:-}" ]]; then
    ENV_ARGS+=(-e "${key}=${!key}")
  fi
done
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
    # Não sobrescrever overrides já passados pelo shell
    if [[ "$key" == MASTER_ADMIN_EMAIL || "$key" == MASTER_ADMIN_PASSWORD || "$key" == MASTER_ADMIN_NAME ]]; then
      [[ -n "${!key:-}" ]] && continue
    fi
    val="${val%\"}"; val="${val#\"}"
    val="${val%\'}"; val="${val#\'}"
    ENV_ARGS+=(-e "${key}=${val}")
  done < "$f"
done

echo "→ VPS import | rede: $NETWORK | postgres:5432"
echo "→ node scripts/$SCRIPT $*"
echo ""

MOUNT_ARGS=(-v "$ROOT:/workspace")
if [[ "$SCRIPT" == "seed-brand-logos.mjs" ]]; then
  UPLOAD_VOL=""
  if cid=$(docker compose ps -q app 2>/dev/null) && [[ -n "$cid" ]]; then
    UPLOAD_VOL=$(docker inspect "$cid" -f '{{range .Mounts}}{{if eq .Destination "/app/uploads"}}{{.Name}}{{end}}{{end}}' 2>/dev/null || true)
  fi
  if [[ -z "$UPLOAD_VOL" ]]; then
    UPLOAD_VOL=$(docker volume ls -q --filter name=uploads_data 2>/dev/null | head -1 || true)
  fi
  if [[ -n "$UPLOAD_VOL" ]]; then
    MOUNT_ARGS+=(-v "${UPLOAD_VOL}:/app/uploads")
    ENV_ARGS+=(-e "UPLOAD_DIR=/app/uploads")
    echo "→ uploads: volume ${UPLOAD_VOL} → /app/uploads"
  else
    echo "Aviso: volume uploads_data não encontrado; logos vão para ./uploads no host." >&2
  fi
fi

# seed/scripts precisam de pg + bcryptjs; na VPS pode não haver node_modules no host
NEED_DEPS=0
if [[ ! -d "$ROOT/node_modules/pg" || ! -d "$ROOT/node_modules/bcryptjs" ]]; then
  NEED_DEPS=1
fi

if [[ "$NEED_DEPS" -eq 1 ]]; then
  echo "→ node_modules incompleto no host; a instalar pg+bcryptjs no contentor"
  docker run --rm \
    --network "$NETWORK" \
    "${ENV_ARGS[@]}" \
    "${MOUNT_ARGS[@]}" \
    -w /workspace \
    node:20-alpine \
    sh -c "npm install --no-save --omit=dev pg bcryptjs >/dev/null && node \"scripts/$SCRIPT\" $*"
else
  docker run --rm \
    --network "$NETWORK" \
    "${ENV_ARGS[@]}" \
    "${MOUNT_ARGS[@]}" \
    -w /workspace \
    node:20-alpine \
    node "scripts/$SCRIPT" "$@"
fi
