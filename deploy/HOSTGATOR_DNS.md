# Domínio www.mecanidoc.com — HostGator + VPS

A app corre na VPS em `http://127.0.0.1:3980` (pasta `mecanidoc`; Nginx faz proxy para o domínio).
O domínio está na **HostGator**. O site público deve ser `https://www.mecanidoc.com`.

## 1) DNS na HostGator (obrigatório)

Sem isto o SSL e o domínio **não** funcionam (o Certbot falha com IP errado).

1. Entra no **cPanel HostGator** → **Zone Editor** (ou Domínios → DNS).
2. No domínio `mecanidoc.com`, ajusta:

| Tipo | Nome / Host | Aponta para | TTL |
|------|-------------|-------------|-----|
| **A** | `@` (ou em branco / `mecanidoc.com`) | `72.61.58.208` | 14400 ou Auto |
| **A** | `www` | `72.61.58.208` | 14400 ou Auto |

3. **Remove** ou altera registos que apontem para outro IP (ex.: `64.29.17.x`, parking, “Website Builder”).
4. Se existir **CNAME** em `www` para a HostGator, apaga-o e usa o **A** acima.
5. Guarda. Propagação: 5 min a algumas horas.

### Confirmar DNS (no teu PC ou na VPS)

```bash
dig +short A mecanidoc.com
dig +short A www.mecanidoc.com
# Ambos DEVEM mostrar: 72.61.58.208
```

Só depois disto pedes o certificado SSL.

## 2) Firewall na VPS

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
# A app MecaniDoc não usa a porta 3000 (é de outro sistema). Acesso direto interno: 3980.
sudo ufw reload
```

## 3) Na VPS (pasta do projeto)

```bash
cd ~/mecanidoc   # ou o caminho real da pasta mecanidoc

# .env com o domínio
grep -q '^NEXT_PUBLIC_APP_URL=' .env \
  && sed -i.bak 's|^NEXT_PUBLIC_APP_URL=.*|NEXT_PUBLIC_APP_URL=https://www.mecanidoc.com|' .env \
  || echo 'NEXT_PUBLIC_APP_URL=https://www.mecanidoc.com' >> .env

grep -q '^AUTH_SECRET=' .env || echo "AUTH_SECRET=$(openssl rand -hex 32)" >> .env

docker compose up -d --force-recreate app

# Nginx + Let's Encrypt (quando dig já mostrar 72.61.58.208)
chmod +x deploy/setup-domain.sh
sudo ./deploy/setup-domain.sh
```

Se o Certbot falhar outra vez:

```bash
# Confirma DNS outra vez, depois:
sudo certbot --nginx -d www.mecanidoc.com -d mecanidoc.com
```

## 4) Resultado esperado

| URL | O que deve acontecer |
|-----|----------------------|
| `https://www.mecanidoc.com` | Site MecaniDoc (HTTPS) |
| `https://mecanidoc.com` | Redireciona para www |
| `http://127.0.0.1:3980` | App MecaniDoc (só na VPS; Nginx proxyia o domínio) |

## Ficheiros neste repo

- `deploy/nginx/mecanidoc.com.conf` — config Nginx (proxy → porta 3980)
- `deploy/setup-domain.sh` — instala Nginx, SSL e atualiza `.env`
- `deploy/.env.vps.example` — exemplo de `.env` na VPS
