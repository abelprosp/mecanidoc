-- Integração Neumáticos Andrés (API v1.8)
-- Execute no Supabase SQL Editor após as migrações base.

-- Configuração global (não inclui credenciais — use variáveis de ambiente)
alter table public.global_settings
  add column if not exists na_integration_enabled boolean default false,
  add column if not exists na_auto_fulfill boolean default true,
  add column if not exists na_auto_sync_stock boolean default false,
  add column if not exists na_use_consignee boolean default false,
  add column if not exists na_consignee_identifier text,
  add column if not exists na_consignee_type integer;

comment on column public.global_settings.na_integration_enabled is 'Ativa integração Neumáticos Andrés';
comment on column public.global_settings.na_auto_fulfill is 'Envia pedido ao fornecedor após pagamento';
comment on column public.global_settings.na_auto_sync_stock is 'Sincroniza stock/preços via cron';

-- Produtos ligados a fornecedor externo
alter table public.products
  add column if not exists external_supplier text,
  add column if not exists external_product_id text,
  add column if not exists external_metadata jsonb default '{}'::jsonb,
  add column if not exists last_stock_sync_at timestamptz;

create index if not exists idx_products_external_supplier on public.products(external_supplier);
create index if not exists idx_products_ean on public.products(ean);

-- Pedidos: estado de fulfillment externo
alter table public.orders
  add column if not exists shipping_province text,
  add column if not exists supplier_fulfillment_status text default 'none',
  add column if not exists estimated_delivery_date date;

comment on column public.orders.supplier_fulfillment_status is 'none | pending | submitted | error | partial';

-- Pedidos enviados ao fornecedor externo
create table if not exists public.supplier_orders (
  id uuid default gen_random_uuid() primary key,
  order_id uuid references public.orders(id) on delete cascade not null,
  integration text not null default 'neumaticos_andres',
  customer_order_id text not null,
  supplier_order_ids text[] default '{}',
  status text not null default 'pending',
  error_message text,
  request_payload jsonb,
  response_payload jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (order_id, integration)
);

create index if not exists idx_supplier_orders_customer_order_id on public.supplier_orders(customer_order_id);
create index if not exists idx_supplier_orders_status on public.supplier_orders(status);

-- Envios / tracking por encomenda
create table if not exists public.order_shipments (
  id uuid default gen_random_uuid() primary key,
  order_id uuid references public.orders(id) on delete cascade not null,
  supplier_order_id text,
  parcel_number text,
  carrier_service text,
  tracking_url text,
  estimated_delivery_date date,
  date_shipped date,
  status_code text,
  status_message text,
  status_date timestamptz,
  raw_payload jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_order_shipments_order_id on public.order_shipments(order_id);
create unique index if not exists idx_order_shipments_parcel_unique
  on public.order_shipments(order_id, coalesce(parcel_number, ''), coalesce(supplier_order_id, ''));

alter table public.supplier_orders enable row level security;
alter table public.order_shipments enable row level security;

drop policy if exists "Supplier orders viewable by order owner" on public.supplier_orders;
create policy "Supplier orders viewable by order owner" on public.supplier_orders
  for select using (
    exists (select 1 from public.orders o where o.id = supplier_orders.order_id and o.user_id = auth.uid())
  );

drop policy if exists "Supplier orders viewable by master" on public.supplier_orders;
create policy "Supplier orders viewable by master" on public.supplier_orders
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'master')
  );

drop policy if exists "Order shipments viewable by order owner" on public.order_shipments;
create policy "Order shipments viewable by order owner" on public.order_shipments
  for select using (
    exists (select 1 from public.orders o where o.id = order_shipments.order_id and o.user_id = auth.uid())
  );

drop policy if exists "Order shipments viewable by master" on public.order_shipments;
create policy "Order shipments viewable by master" on public.order_shipments
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'master')
  );
