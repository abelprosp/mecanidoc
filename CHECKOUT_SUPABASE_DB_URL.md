# SUPABASE_DB_URL – Checkout (order_items)

O checkout insere os itens do pedido (**order_items**) através de uma API que usa **conexão direta à base de dados**. Assim contornamos o erro “table not found in schema cache” do Supabase.

## O que fazer

1. **Obter a connection string**
   - Abre o [Supabase Dashboard](https://supabase.com/dashboard) e escolhe o teu projeto.
   - Menu lateral: **Settings** (engrenagem) → **Database**.
   - Em **Connection string** escolhe **URI** (ou **Session mode**).
   - Copia o URL. O formato é algo como:
     ```
     postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
     ```
   - Substitui `[YOUR-PASSWORD]` pela **palavra-passe da base de dados** (a que definiste ao criar o projeto; se não lembras, podes repor em **Database** → **Reset database password**).

2. **Colocar no `.env`**
   - No teu ficheiro `.env` na raiz do projeto, adiciona:
     ```
     SUPABASE_DB_URL=postgresql://postgres.xxxxx:TUAPASSWORD@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
     ```
   - Usa o URL que copiaste, com a password real no sítio certo (sem `[]`).

3. **Reiniciar o servidor**
   - Para o `npm run dev` (Ctrl+C) e volta a correr:
     ```
     npm run dev
     ```

4. **Testar o checkout**
   - Coloca um produto no carrinho, vai ao checkout e clica em **Place order**. Os itens devem ser gravados em **order_items** mesmo que a tabela não apareça ainda na API REST do Supabase.

## Segurança

- **Nunca** faças commit do `.env` nem partilhes a `SUPABASE_DB_URL` (contém a password da base).
- A API `/api/checkout/order-items` só insere itens em pedidos que pertençam ao utilizador autenticado (sessão via cookies).
