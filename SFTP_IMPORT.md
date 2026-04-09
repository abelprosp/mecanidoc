# Importação de produtos (CSV)

Três formas suportadas pelo servidor (utilizador **supplier** ou **master**). Todas usam o mesmo mapeamento de colunas que o upload manual em `/dashboard/products`.

Requisitos comuns:

- `NEXT_PUBLIC_SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` no ambiente onde corre a app (ex.: Vercel).
- Sessão com `profiles.role = supplier` ou `master`.

---

## 1. SFTP (variáveis de ambiente)

```env
SFTP_HOST=seu-servidor.com
SFTP_PORT=22
SFTP_USER=usuario
SFTP_PASSWORD=senha
# ou: SFTP_PRIVATE_KEY="-----BEGIN ...-----"
SFTP_PRODUCTS_PATH=/caminho/produtos.csv
```

- UI: botão **Importer via SFTP**
- API: `POST /api/admin/import-products-sftp`

---

## 2. URL HTTPS (corpo JSON)

O servidor descarrega o CSV a partir de uma URL pública **http(s)**.

- Limite: ~15 MB, timeout ~45 s.
- Bloqueios básicos anti-SSRF: localhost, IPs privados comuns, metadata.
- **Google Drive / Dropbox**: só funcionam com **link de descarga direta** do ficheiro (não a página HTML do ficheiro).

Exemplo:

```bash
curl -X POST https://seu-dominio.com/api/admin/import-products-url \
  -H "Content-Type: application/json" \
  -H "Cookie: ... sessão supplier/master ..." \
  -d "{\"url\":\"https://exemplo.com/exports/produtos.csv\"}"
```

- UI: campo URL + **Importer depuis URL**
- API: `POST /api/admin/import-products-url` — body `{ "url": "https://..." }`

---

## 3. Supabase Storage

1. No Supabase SQL Editor, execute `supabase_storage_product_imports.sql` (cria o bucket `product-imports`).
2. No dashboard Supabase → **Storage**, envie o CSV (ex.: `imports/produtos.csv`).
3. Na app, preencha **bucket** (ou deixe `product-imports`) e **chemin** do ficheiro.

- A API lê o ficheiro com a **service role** (não precisa de URL pública).
- API: `POST /api/admin/import-products-storage` — body `{ "path": "imports/produits.csv", "bucket": "product-imports" }` (bucket opcional).

---

## Código partilhado

- Lógica CSV + inserção: `src/lib/import-products-from-csv.ts`
- Verificação supplier/master: `src/lib/admin-auth-server.ts`
