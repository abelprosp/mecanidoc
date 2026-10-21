#!/usr/bin/env bash
# Repara volume Postgres antigo na VPS:
#   1. cria stripe_webhook_events (em falta no init original)
#   2. reaplica harden
#   3. cria master admin via socket interno (não usa localhost:5432)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

bash "$ROOT/scripts/db-harden.sh"
docker compose up -d --force-recreate db-roles app

node "$ROOT/scripts/seed-master-admin.mjs"
