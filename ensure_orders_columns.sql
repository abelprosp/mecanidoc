-- Cria as tabelas orders e order_items (e colunas em falta) para o checkout funcionar.
-- Execute no Supabase SQL Editor e depois tente novamente "Place order".

-- 1. Tabela orders (criar se não existir)
create table if not exists public.orders (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  total_amount numeric not null,
  status text default 'pending',
  created_at timestamptz default now()
);

-- 2. Colunas de contacto e envio em orders
alter table public.orders
  add column if not exists contact_name text,
  add column if not exists contact_phone text,
  add column if not exists contact_email text,
  add column if not exists shipping_address text,
  add column if not exists shipping_city text,
  add column if not exists shipping_zip text,
  add column if not exists shipping_country text,
  add column if not exists notes text;

-- 3. Colunas Stripe em orders
alter table public.orders
  add column if not exists stripe_payment_intent_id text,
  add column if not exists stripe_customer_id text,
  add column if not exists payment_method text default 'stripe',
  add column if not exists payment_status text default 'pending';

create index if not exists idx_orders_stripe_payment_intent on public.orders(stripe_payment_intent_id);
create index if not exists idx_orders_payment_status on public.orders(payment_status);

-- 4. RLS em orders
alter table public.orders enable row level security;

drop policy if exists "Orders viewable by own user" on public.orders;
create policy "Orders viewable by own user" on public.orders for select using (auth.uid() = user_id);

drop policy if exists "Orders viewable by master" on public.orders;
create policy "Orders viewable by master" on public.orders for select using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'master')
);

drop policy if exists "Users can create orders" on public.orders;
create policy "Users can create orders" on public.orders for insert with check (auth.uid() = user_id);

-- 5. Tabela order_items (sem FK para products/garages para criar mesmo se essas tabelas não existirem)
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

-- Policy "linked garage" só se a tabela garages existir (opcional)
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'garages') then
    drop policy if exists "Order items viewable by linked garage" on public.order_items;
    execute 'create policy "Order items viewable by linked garage" on public.order_items for select using (
      exists (select 1 from public.garages where id = order_items.garage_id and profile_id = auth.uid())
    )';
  end if;
end $$;
