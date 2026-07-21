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
ln -sfn "$NGINX_AVAIL" "$NGINX_ENABLED"

# Evitar conflito com default que captura tudo
if [[ -L /etc/nginx/sites-enabled/default ]]; then
  rm -f /etc/nginx/sites-enabled/default
fi

nginx -t
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

echo "==> Pedir certificado Let's Encrypt"
certbot --nginx -d "$DOMAIN_WWW" -d "$DOMAIN_APEX" --non-interactive --agree-tos --register-unsafely-without-email --redirect || {
  echo ""
  echo "Certbot falhou (DNS ainda a propagar?). Podes repetir depois:"
  echo "  sudo certbot --nginx -d ${DOMAIN_WWW} -d ${DOMAIN_APEX}"
  echo ""
  echo "Por agora o site deve responder em http://${DOMAIN_WWW}"
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
