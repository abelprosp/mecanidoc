# Variáveis de ambiente (.env) – MecaniDoc


## DATABASE_URL (Postgres local)

Para `npm run dev` e scripts no **host** (`seed:*`, imports):

```
DATABASE_URL=postgresql://mecanidoc:mecanidoc@localhost:5432/mecanidoc
```

- `npm run docker:postgres` → porta **5432**
- `docker compose -f docker-compose.dev.yml up -d` → porta **5433** (`@localhost:5433`)

O hostname `postgres` só funciona **dentro** da rede Docker Compose (serviço `app`). Não use `postgres` no `.env` do host.

## VPS / produção (Docker Compose)

Deploy recomendado: `docker compose up -d` na VPS (serviços `postgres` + `app`).

### `.env` na raiz do projeto **na VPS**

```env
# O serviço `app` no docker-compose.yml já usa internamente:
#   postgresql://mecanidoc:mecanidoc@postgres:5432/mecanidoc
# (hostname `postgres` = nome do serviço na rede Docker — NÃO use localhost no container)

AUTH_SECRET=cole_aqui_openssl_rand_hex_32
NEXT_PUBLIC_APP_URL=https://seu-dominio.com

# Opcionais (integrações)
# NEUMATICOS_ANDRES_LOGIN=...
# NEUMATICOS_ANDRES_PASSWORD=...
# NEUMATICOS_ANDRES_BASE_URL=https://backend.genasa.es
# NEUMATICOS_ANDRES_TEST_MODE=0
# STRIPE_SECRET_KEY=...
# NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=...
# STRIPE_WEBHOOK_SECRET=...
# CRON_SECRET=um_segredo_longo_aleatorio
```

Gerar `AUTH_SECRET` na VPS:

```bash
openssl rand -hex 32
```

`NEXT_PUBLIC_APP_URL` deve ser a URL pública (domínio ou IP) com `https://` se houver TLS. Depois de alterar o `.env`, recrie o contentor da app:

```bash
docker compose up -d --force-recreate app
```

### DATABASE_URL — onde usar cada hostname

| Onde corre o processo | Hostname correto |
|----------------------|------------------|
| Contentor `app` (Compose) | `postgres` (já definido no `docker-compose.yml`) |
| Scripts na rede Docker (`npm run …:vps` / `vps-import.sh`) | `postgres` (forçado pelo script) |
| Node no host da VPS (porta 5432 publicada) | `localhost` |
| Mac / laptop a apontar para a BD da VPS | host/IP público da VPS (não `localhost` nem `postgres`) |

O `.env` do Mac (`localhost:5432`) **não** é a base de dados da VPS. Seed no laptop só cria o admin na BD local.

### Criar o master admin **na VPS** (na BD da VPS)

Na pasta do projeto na VPS, com `postgres` a correr:

```bash
# Recomendado (entra na rede Docker e grava na BD correta)
npm run seed:master-admin:vps

# Alternativa com Compose overlay
docker compose -f docker-compose.yml -f docker-compose.import.yml run --rm import node scripts/seed-master-admin.mjs

# Se a porta 5432 estiver publicada no host e tiver Node instalado:
DATABASE_URL=postgresql://mecanidoc:mecanidoc@localhost:5432/mecanidoc npm run seed:master-admin
```

Credenciais por omissão do seed (override com `MASTER_ADMIN_EMAIL` / `MASTER_ADMIN_PASSWORD`):

- email: o definido no script (ou `MASTER_ADMIN_EMAIL=...`)
- password: a definida no script (ou `MASTER_ADMIN_PASSWORD=...`)

Não corra `seed:master-admin` no Mac à espera de fazer login na VPS.

### Checklist rápido (VPS em IP, ex. `http://72.61.58.208:3000`)

Na pasta do projeto **na VPS** (SSH):

```bash
cd /caminho/do/mecanidoc   # pasta com docker-compose.yml

# 1) .env mínimo
grep -q '^AUTH_SECRET=' .env 2>/dev/null || echo "AUTH_SECRET=$(openssl rand -hex 32)" >> .env
# ajuste/garanta a URL pública HTTP:
grep -q '^NEXT_PUBLIC_APP_URL=' .env && sed -i.bak 's|^NEXT_PUBLIC_APP_URL=.*|NEXT_PUBLIC_APP_URL=http://72.61.58.208:3000|' .env \
  || echo 'NEXT_PUBLIC_APP_URL=http://72.61.58.208:3000' >> .env

# 2) Postgres + app
docker compose up -d
docker compose ps

# 3) Criar/atualizar master admin NA BD da VPS
MASTER_ADMIN_EMAIL=joaogodinho422@gmail.com \
MASTER_ADMIN_PASSWORD='Mecanidoc2023-' \
npm run seed:master-admin:vps

# 4) Recriar app para ler .env (e, se atualizou código do cookie HTTP, rebuild)
docker compose up -d --force-recreate app
# Se puxou código novo: docker compose up -d --build --force-recreate app

# 5) Testar login
curl -sS -X POST http://127.0.0.1:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"joaogodinho422@gmail.com","password":"Mecanidoc2023-"}'
# Esperado: HTTP 200 com {"user":{...}}
```


## Para o Next.js ler o `.env`

1. **Ficheiro no sítio certo**  
   O ficheiro deve chamar-se `.env` ou `.env.local` e ficar na **raiz do projeto** (mesma pasta que `package.json`).

2. **Nomes exatos (Supabase)**  
   - `NEXT_PUBLIC_SUPABASE_URL` – URL do projeto (ex: `https://xxxx.supabase.co`)  
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` – chave “anon” / pública (começa por `eyJ...`)

   Sem o prefixo `NEXT_PUBLIC_` estas variáveis **não** ficam disponíveis no browser e o login pode falhar.

3. **Reiniciar o servidor**  
   Depois de alterar o `.env` ou `.env.local`, pare o `npm run dev` (Ctrl+C) e volte a executar:

   ```bash
   npm run dev
   ```

4. **Sem espaços ou aspas a mais**  
   No `.env` use uma linha por variável, sem espaços à volta do `=` e sem aspas à volta do valor (a não ser que o valor tenha espaços):

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://yjdoprfjgaeyvvyhpihd.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

## Se o login der 400 (Bad Request)

- Confirme no **Supabase Dashboard** > **Authentication** > **Users** que o utilizador existe e que o email está **confirmado**.
- Confirme que a **anon key** no `.env` é a do mesmo projeto que a URL (Dashboard > Project Settings > API).
- Teste o login com a mesma senha que definiu no Supabase (ou use “Reset password” no Dashboard).

## Neumáticos Andrés (integração API)

Variáveis **só no servidor** (sem `NEXT_PUBLIC_`):

```env
NEUMATICOS_ANDRES_LOGIN=login_fornecido_pelo_andres
NEUMATICOS_ANDRES_PASSWORD=password_fornecido_pelo_andres
NEUMATICOS_ANDRES_BASE_URL=https://backend-pre2.genasa.es
NEUMATICOS_ANDRES_TEST_MODE=1
CRON_SECRET=um_segredo_longo_aleatorio
AUTH_SECRET=segredo_longo_minimo_16_chars
```

- **Teste:** `NEUMATICOS_ANDRES_BASE_URL=https://backend-pre2.genasa.es` e `NEUMATICOS_ANDRES_TEST_MODE=1`
- **Produção:** `https://backend.genasa.es` e `NEUMATICOS_ANDRES_TEST_MODE=0`
- **Alternativa:** pode configurar login/password no painel Admin → Neumáticos Andrés (cifrado com `AUTH_SECRET`). O `.env` tem prioridade se existir.

### Ordem de ativação

1. Executar `create_neumaticos_andres_integration.sql` e `create_supplier_api.sql` no SQL Editor
2. Adicionar as variáveis acima ao `.env` **ou** guardar credenciais no painel; reiniciar `npm run dev` se usou `.env`
3. Admin → **Neumáticos Andrés** → **Guardar ligação API** → **Testar ligação**
4. Clicar **Puxar pneus agora** (ou marcar produtos via CSV / SQL)
5. Clicar **Sync stock & preço**
6. Ativar integração e fazer um pedido de teste (Stripe em modo teste)

### API pública de fornecedores

Ver `SUPPLIER_API.md` — chaves em Dashboard Fornecedor → **API Produtos**.
