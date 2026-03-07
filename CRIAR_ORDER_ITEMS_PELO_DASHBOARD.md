# Criar a tabela order_items pelo Dashboard do Supabase

Se o SQL não fizer a tabela aparecer na API, crie-a pela interface:

## Passo 1: Abrir o Table Editor

1. Abre o [Supabase Dashboard](https://supabase.com/dashboard) e entra no teu projeto.
2. No menu lateral, clica em **Table Editor**.
3. Clica em **New table**.

## Passo 2: Configurar a tabela

- **Name:** `order_items`
- **Schema:** `public`
- Deixa **Enable Row Level Security (RLS)** **ligado** (checked).

Clica em **Save** (só para criar a tabela vazia).

## Passo 3: Adicionar as colunas

Na tabela `order_items`, clica em **Add column** e cria cada coluna:

| Name         | Type        | Nullable | Default                    |
|-------------|-------------|----------|----------------------------|
| id          | uuid        | No       | `gen_random_uuid()`        |
| order_id    | uuid        | No       | — (Foreign key → orders.id)|
| product_id  | uuid        | No       | —                          |
| quantity    | int4        | No       | `1`                        |
| price       | numeric     | No       | —                          |
| garage_id   | uuid        | Yes      | —                          |
| created_at  | timestamptz | No       | `now()`                    |

**Para `id`:** marca como **Primary key** (ao criar a coluna ou em "Edit column").

**Para `order_id`:** em "Edit column" → **Foreign key** → Referenced table: `orders`, Referenced column: `id`. (Se der erro, pode ser criada sem FK.)

## Passo 4: Policies (RLS)

Com RLS ligado, é preciso criar policies para a app conseguir inserir e ler:

1. Em **Table Editor** → tabela **order_items** → aba **Policies** (ou **Authentication** > **Policies**).
2. **New policy** → "Create policy from scratch".

**Policy 1 – Insert**
- Name: `Users can insert order items`
- Allowed operation: **INSERT**
- Target roles: `authenticated`
- USING expression: (deixar vazio para INSERT)
- WITH CHECK expression:
  ```sql
  exists (select 1 from public.orders o where o.id = order_items.order_id and o.user_id = auth.uid())
  ```

**Policy 2 – Select**
- Name: `Order items viewable by owner`
- Allowed operation: **SELECT**
- Target roles: `authenticated`
- USING expression:
  ```sql
  exists (select 1 from public.orders o where o.id = order_items.order_id and o.user_id = auth.uid())
  ```

Guarda as policies.

## Passo 5: Testar na app

Aguarda alguns segundos e tenta outra vez **Place order** na aplicação. A tabela criada pelo Dashboard costuma ficar logo visível na API.
