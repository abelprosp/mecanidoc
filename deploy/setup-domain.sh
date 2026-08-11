#!/usr/bin/env bash
# Configura Nginx + SSL para www.mecanidoc.com na VPS.
# Uso (na pasta do projeto na VPS):
#   chmod +x deploy/setup-domain.sh
#   sudo ./deploy/setup-domain.sh
#
# Pré-requisitos:
#   - DNS A de mecanidoc.com e www.mecanidoc.com → IP desta VPS
#   - docker compose com a app a escutar em 127.0.0.1:3000 (ou 0.0.0.0:3000)
#   - Portas 80 e 443 abertas no firewall

set -euo pipefail

DOMAIN_WWW="www.mecanidoc.com"
DOMAIN_APEX="mecanidoc.com"
APP_URL="https://${DOMAIN_WWW}"
# IP da VPS MecaniDoc (HostGator DNS deve apontar para aqui)
EXPECTED_IP="${MECANIDOC_VPS_IP:-72.61.58.208}"
NGINX_SRC="$(cd "$(dirname "$0")" && pwd)/nginx/mecanidoc.com.conf"
NGINX_AVAIL="/etc/nginx/sites-available/mecanidoc.com"
NGINX_ENABLED="/etc/nginx/sites-enabled/mecanidoc.com"
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${PROJECT_ROOT}/.env"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Corre com sudo: sudo ./deploy/setup-domain.sh"
  exit 1
fi

if [[ ! -f "$NGINX_SRC" ]]; then
  echo "Ficheiro não encontrado: $NGINX_SRC"
  exit 1
fi

resolve_a() {
  local name="$1"
  if command -v dig >/dev/null 2>&1; then
    dig +short A "$name" | grep -E '^[0-9.]+$' | head -1 || true
  elif command -v getent >/dev/null 2>&1; then
    getent ahostsv4 "$name" | awk '{print $1; exit}' || true
  else
    python3 - <<PY 2>/dev/null || true
import socket
try:
  print(socket.gethostbyname("${name}"))
except Exception:
  pass
PY
  fi
}

echo "==> Verificar DNS (HostGator → VPS ${EXPECTED_IP})"
IP_WWW="$(resolve_a "$DOMAIN_WWW")"
IP_APEX="$(resolve_a "$DOMAIN_APEX")"
echo "    ${DOMAIN_WWW} → ${IP_WWW:-???}"
echo "    ${DOMAIN_APEX} → ${IP_APEX:-???}"

DNS_OK=1
if [[ "$IP_WWW" != "$EXPECTED_IP" || "$IP_APEX" != "$EXPECTED_IP" ]]; then
  DNS_OK=0
  echo ""
  echo "AVISO: DNS ainda não aponta para ${EXPECTED_IP}."
  echo "Na HostGator (cPanel → Zone Editor) cria/edita:"
  echo "  A  @    → ${EXPECTED_IP}"
  echo "  A  www  → ${EXPECTED_IP}"
  echo "Guia: deploy/HOSTGATOR_DNS.md"
  echo ""
fi

# Abrir portas se ufw existir
if command -v ufw >/dev/null 2>&1; then
  echo "==> Firewall: permitir 80 e 443"
  ufw allow 80/tcp >/dev/null 2>&1 || true
  ufw allow 443/tcp >/dev/null 2>&1 || true
fi

echo "==> Instalar Nginx e Certbot (se necessário)"
if command -v apt-get >/dev/null 2>&1; then
  apt-get update -qq
  DEBIAN_FRONTEND=noninteractive apt-get install -y -qq nginx certbot python3-certbot-nginx
elif command -v dnf >/dev/null 2>&1; then
  dnf install -y nginx certbot python3-certbot-nginx
else
  echo "Instala nginx e certbot manualmente neste SO."
  exit 1
fi

mkdir -p /var/www/certbot

echo "==> Copiar config Nginx"
cp "$NGINX_SRC" "$NGINX_AVAIL"
# Corrige typo antigo se existir noutros ficheiros Nginx
grep -rl 'proxy_add_x_forward_for' /etc/nginx/ 2>/dev/null | while read -r f; do
  sed -i 's/proxy_add_x_forward_for/proxy_add_x_forwarded_for/g' "$f"
done || true
ln -sfn "$NGINX_AVAIL" "$NGINX_ENABLED"

# Evitar conflito com default que captura tudo
if [[ -L /etc/nginx/sites-enabled/default ]]; then
  rm -f /etc/nginx/sites-enabled/default
fi

if ! nginx -t; then
  echo "Nginx config inválida. Procura o typo:"
  echo "  grep -rn proxy_add_x_forward /etc/nginx/"
  exit 1
fi
systemctl enable nginx
systemctl reload nginx

echo "==> Atualizar NEXT_PUBLIC_APP_URL no .env → ${APP_URL}"
touch "$ENV_FILE"
if grep -q '^NEXT_PUBLIC_APP_URL=' "$ENV_FILE"; then
  sed -i.bak "s|^NEXT_PUBLIC_APP_URL=.*|NEXT_PUBLIC_APP_URL=${APP_URL}|" "$ENV_FILE"
else
  echo "NEXT_PUBLIC_APP_URL=${APP_URL}" >> "$ENV_FILE"
fi

if ! grep -q '^AUTH_SECRET=' "$ENV_FILE"; then
  echo "AUTH_SECRET=$(openssl rand -hex 32)" >> "$ENV_FILE"
  echo "    AUTH_SECRET gerado e escrito no .env"
fi

echo "==> Recriar contentor app (ler novo .env)"
cd "$PROJECT_ROOT"
if command -v docker >/dev/null 2>&1; then
  docker compose up -d --force-recreate app || true
fi

if [[ "$DNS_OK" -ne 1 ]]; then
  echo ""
  echo "Nginx e .env estão prontos, mas o SSL fica para depois do DNS."
  echo "Quando dig +short A www.mecanidoc.com = ${EXPECTED_IP}, corre:"
  echo "  sudo certbot --nginx -d ${DOMAIN_WWW} -d ${DOMAIN_APEX}"
  echo ""
  echo "Por agora: http://${DOMAIN_WWW} (se DNS já apontar) ou http://${EXPECTED_IP}:3000"
  exit 0
fi

echo "==> Pedir certificado Let's Encrypt"
certbot --nginx -d "$DOMAIN_WWW" -d "$DOMAIN_APEX" --non-interactive --agree-tos --register-unsafely-without-email --redirect || {
  echo ""
  echo "Certbot falhou. Confirma:"
  echo "  1) DNS A @ e www = ${EXPECTED_IP} (HostGator Zone Editor)"
  echo "  2) Portas 80/443 abertas na VPS"
  echo "  3) Nginx a responder: curl -I http://127.0.0.1 -H 'Host: www.mecanidoc.com'"
  echo "Depois:"
  echo "  sudo certbot --nginx -d ${DOMAIN_WWW} -d ${DOMAIN_APEX}"
  echo ""
  echo "Por agora o site pode responder em http://${DOMAIN_WWW}"
  exit 0
}

nginx -t && systemctl reload nginx

echo ""
echo "Pronto."
echo "  Site:  ${APP_URL}"
echo "  Apex:  https://${DOMAIN_APEX} → redireciona para www"
echo "  App:   proxy → 127.0.0.1:3000"
echo ""
echo "Confirma no browser: ${APP_URL}"
