-- Cria apenas a tabela order_items (para quando orders já existe mas order_items não).
-- Execute no Supabase SQL Editor.

create table if not exists public.order_items (
  id uuid default gen_random_uuid() primary key,
  order_id uuid references public.orders(id) on delete cascade not null,
  product_id uuid not null,
  quantity integer not null default 1,
  price numeric not null,
  garage_id uuid,
  created_at timestamptz default now()
);

alter table public.order_items enable row level security;

drop policy if exists "Order items viewable by owner" on public.order_items;
create policy "Order items viewable by owner" on public.order_items for select using (
  exists (select 1 from public.orders where id = order_items.order_id and user_id = auth.uid())
);

drop policy if exists "Order items viewable by master" on public.order_items;
create policy "Order items viewable by master" on public.order_items for select using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'master')
);

drop policy if exists "Users can insert order items" on public.order_items;
create policy "Users can insert order items" on public.order_items for insert with check (
  exists (select 1 from public.orders where id = order_items.order_id and user_id = auth.uid())
);

-- Permissões para a API ver a tabela + recarregar schema
grant usage on schema public to anon, authenticated;
grant all on public.order_items to anon, authenticated;
grant all on public.order_items to service_role;
notify pgrst, 'reload schema';
