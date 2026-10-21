# MecaniDoc

Loja online de pneus (auto, moto, camião, trator) com montagem em garagens parceiras. Next.js 16 (App Router), PostgreSQL, Stripe.

## Arquitetura resumida

- **Front-end / API**: Next.js em `src/app`. As rotas em `src/app/api` são a única forma de a aplicação falar com a base de dados.
- **Base de dados**: PostgreSQL com Row Level Security. Dois papéis:
  - `mecanidoc_app` — papel de LOGIN usado pela aplicação; **sem privilégios especiais**, sujeito a RLS.
  - `mecanidoc_admin` — papel NOLOGIN com `BYPASSRLS`; o servidor eleva para ele com `SET LOCAL ROLE` dentro de uma transação (`withAdminContext`) apenas em código de servidor confiável (webhooks Stripe, jobs, admin).
  - O superutilizador (`POSTGRES_USER`) só é usado para inicializar/migrar e pelos scripts em `scripts/` (importações).
- **`/api/db`**: API genérica de leitura/escrita usada pelo browser. Só aceita as tabelas e operações listadas em `src/lib/db/api-policy.ts`; a autorização real é feita pelo RLS + triggers de guarda no PostgreSQL.
- **Checkout**: o preço é sempre calculado no servidor (`src/lib/checkout/quote.ts`). O browser só envia itens, tipo de entrega e garantia; a encomenda e as linhas são criadas numa única transação (`/api/checkout/create-order`) e depois é aberta a sessão Stripe.
- **Pagamentos**: `markOrderPaid` é idempotente (UPDATE condicional). O webhook regista o evento antes de o processar (`stripe_webhook_events`) e liberta-o se falhar. A encomenda ao fornecedor é tentada após pagamento e repetida pelo cron (`/api/cron/neumaticos-andres`).

## Variáveis de ambiente

Copia `.env.example` para `.env` e preenche. Obrigatórias em produção:

| Variável | Uso |
| --- | --- |
| `POSTGRES_PASSWORD` | Superutilizador (só init/migrações/scripts) |
| `MECANIDOC_APP_DB_PASSWORD` | Password do papel PostgreSQL `mecanidoc_app` — **não é** o login do site |
| `PGHOST` / `PGUSER` / `PGPASSWORD` | O compose preenche-as; a app já não monta `DATABASE_URL` com a senha crua (evita falha se a senha tiver `@`) |
| `DB_ADMIN_ROLE` | Papel de elevação (defeito `mecanidoc_admin`) |
| `AUTH_SECRET` | Assinatura do JWT de sessão e cifra de segredos na BD |
| `CRON_SECRET` | Autoriza chamadas às rotas `/api/cron/*` |
| `NEXT_PUBLIC_APP_URL` | URL pública (https) — usada em e-mails e cookies |
| `SMTP_HOST/PORT/USER/PASS/FROM` | Envio de e-mails (recuperação de password). Em alternativa configura-se no admin › suporte |
| `ALLOW_INSECURE_COOKIES` | `1` apenas para testar produção em http; nunca em produção real |

As chaves Stripe e da API de fornecedor podem ser guardadas cifradas na tabela `global_settings` através do painel admin.

## Arranque

```bash
cp .env.example .env      # preencher
docker compose up -d      # postgres + sync de papéis + app
npm run seed:master-admin # cria o utilizador master do SITE
```

O formulário `/auth/login` usa um e-mail em `public.users` (o seed), **nunca** o utilizador `mecanidoc_app`. Se o browser mostrar `password authentication failed for user "mecanidoc_app"`, a senha da **base** no `.env` não coincide com o papel no Postgres. Corrija no VPS:

```bash
# no .env: MECANIDOC_APP_DB_PASSWORD=a-mesma-que-quer-usar
bash scripts/db-harden.sh
docker compose up -d --force-recreate db-roles app
```

Desenvolvimento local sem Docker para a app: `npm run dev` com `DATABASE_URL` a apontar para o Postgres do compose (`docker-compose.dev.yml`).

### Base de dados existente (upgrade)

Os ficheiros em `docker/postgres/init/` só correm num volume novo. Para aplicar o modelo de papéis, RLS e novas colunas a uma base já existente:

```bash
bash scripts/db-harden.sh
```

O script é idempotente (aplica `01-roles.sh`, `05-support.sql`, `06-security.sql`, `99-grants.sql`). Depois de correr, garante que `DATABASE_URL` da app usa o utilizador `mecanidoc_app` e reinicia o contentor.

Se a aplicação estiver ligada com um superutilizador continua a funcionar (usa `SET LOCAL row_security = off` para o contexto admin) mas escreve um aviso no arranque — não é configuração suportada em produção.

## Operação

- **Health check**: `GET /api/health` (app + ligação à BD). Usado pelo `healthcheck` do serviço `app` no compose.
- **Backups**: `docker compose exec postgres pg_dump -U $POSTGRES_USER -Fc mecanidoc > backup-$(date +%F).dump`; restaurar com `pg_restore -U $POSTGRES_USER -d mecanidoc --clean backup.dump`. Agenda um cron diário no host e guarda cópias fora do servidor. Os uploads vivem no volume `uploads_data`.
- **Cron de fornecedor**: `GET /api/cron/neumaticos-andres` com `Authorization: Bearer $CRON_SECRET` (por exemplo de hora a hora). Sincroniza catálogo e repete encomendas ao fornecedor que ficaram pendentes.
- **Webhook Stripe**: `POST /api/stripe/webhook`. Em desenvolvimento: `npm run stripe:listen`.
- **Logs**: `npm run docker:logs`.

## Scripts úteis

| Comando | Descrição |
| --- | --- |
| `npm run dev` / `npm run build` / `npm start` | Next.js |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | Verificação de tipos |
| `npm run seed:master-admin` | Cria/atualiza o utilizador master |
| `npm run import:na-*` | Importação de catálogo Neumáticos Andrés (sufixo `:vps` corre dentro do contentor) |
| `npm run enrich:*` | Enriquecimento de fichas (EPREL, GTIN…) |

## Segurança — o que está garantido pela base de dados

- Perfis: cada utilizador lê/edita apenas o seu; `role`, `email` e flags administrativas só mudam por master (trigger `guard_profile_columns`).
- Garagens/fornecedores/empresas: aprovação, comissões e `discount_tier` só por master.
- Encomendas: criadas só pelo servidor; depois de pagas, valores e linhas ficam bloqueados (`guard_paid_order*`); stock decrementado por trigger no pagamento.
- Segredos (`*_enc` em `global_settings`) nunca são devolvidos pela `/api/db`.
- Tokens de recuperação de password: hash SHA-256, 60 minutos, uso único.
- URLs fornecidas por utilizadores (import CSV, imagens remotas) passam por `src/lib/safe-fetch.ts` (anti-SSRF: DNS privado bloqueado, redirects revalidados, tamanho limitado).

## Estrutura

```
src/app            páginas e rotas API
src/components     componentes React
src/lib/db         pool, query-builder, política da /api/db, cliente servidor/browser
src/lib/checkout   cálculo de orçamento (servidor)
src/lib/auth       sessão, validação, recuperação de password
docker/postgres    schema e migrações de inicialização
scripts            importações, seeds, db-harden.sh
```
