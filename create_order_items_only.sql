-- MÍNIMO: cria só a tabela order_items e uma policy de insert.
-- Use isto se create_order_items_table.sql falhar (ex.: tabela profiles não existe).
-- Depois de executar: aguarde 30–60 s e tente novamente "Place order".

-- 1. Criar tabela (só depende de orders)
create table if not exists public.order_items (
  id uuid default gen_random_uuid() primary key,
  order_id uuid references public.orders(id) on delete cascade not null,
  product_id uuid not null,
  quantity integer not null default 1,
  price numeric not null,
  garage_id uuid,
  created_at timestamptz default now()
);

-- 2. RLS
alter table public.order_items enable row level security;

-- 3. Policy para utilizadores inserirem itens nos seus próprios pedidos
drop policy if exists "Users can insert order items" on public.order_items;
create policy "Users can insert order items" on public.order_items for insert with check (
  exists (select 1 from public.orders o where o.id = order_items.order_id and o.user_id = auth.uid())
);

-- 4. Policy para utilizadores verem os itens dos seus pedidos
drop policy if exists "Order items viewable by owner" on public.order_items;
create policy "Order items viewable by owner" on public.order_items for select using (
  exists (select 1 from public.orders o where o.id = order_items.order_id and o.user_id = auth.uid())
);

-- 5. Permissões para a API Supabase ver e usar a tabela
grant usage on schema public to anon, authenticated;
grant all on public.order_items to anon, authenticated;
grant all on public.order_items to service_role;

-- 6. Pedir ao PostgREST para recarregar o schema (Supabase usa isto)
notify pgrst, 'reload schema';

-- 7. Verificação: deve devolver 1 linha com nome 'order_items'
select 1 as ok, 'order_items' as table_name
from information_schema.tables
where table_schema = 'public' and table_name = 'order_items';
