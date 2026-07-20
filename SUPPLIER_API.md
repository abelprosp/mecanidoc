# API de fornecedores — MecaniDoc

## 1. API pública (fornecedores → MecaniDoc)

Fornecedores aprovados podem **enviar** e **consultar** os seus produtos.

### Criar chave

No dashboard do fornecedor → **API Produtos** → **Criar chave**.  
A chave completa (`mdk_…`) só é mostrada uma vez.

### Autenticação

```http
Authorization: Bearer mdk_...
```

ou

```http
X-API-Key: mdk_...
```

### Endpoints

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/v1/me` | Conta + resumo de produtos |
| GET | `/api/v1/products` | Listar (`?q=`, `?ean=`, `?sku=`, `?limit=`, `?active=1`) |
| POST | `/api/v1/products` | Criar ou atualizar (upsert por EAN/SKU) |
| GET | `/api/v1/products/:id` | Detalhe |
| PATCH | `/api/v1/products/:id` | Atualizar parcial |
| DELETE | `/api/v1/products/:id` | Desativar (`?hard=1` para apagar) |

### Exemplo POST

```bash
curl -X POST https://seu-dominio.com/api/v1/products \
  -H "Authorization: Bearer mdk_SUA_CHAVE" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Pneu 205/55 R16",
    "base_price": 89.90,
    "stock_quantity": 20,
    "ean": "3286341675412",
    "sku": "REF-123",
    "category": "Auto",
    "brand": "Michelin",
    "specs": { "width": "205", "height": "55", "diameter": "16" }
  }'
```

Também aceita lote: `{ "products": [ {...}, {...} ] }` (máx. 100).

### Migração SQL

Execute `create_supplier_api.sql` na base de dados.

---

## 2. Ligar API europeia e puxar pneus (admin)

No admin → **Neumáticos Andrés**:

1. **Ligar API do fornecedor** — login, password, URL (teste ou produção)
2. **Testar ligação**
3. **Puxar pneus da API europeia** — importa catálogo (preço + stock)
4. Ativar integração e sync de stock/tracking conforme necessário

Credenciais no painel são cifradas com `AUTH_SECRET`.  
Se existirem `NEUMATICOS_ANDRES_LOGIN` / `PASSWORD` no `.env`, o `.env` tem prioridade.

### API interna (master)

- `GET/POST /api/integrations/neumaticos-andres/credentials`
- `POST /api/integrations/neumaticos-andres/import-catalog`
- `POST /api/integrations/neumaticos-andres/test-connection`
- `POST /api/integrations/neumaticos-andres/sync-stock`
