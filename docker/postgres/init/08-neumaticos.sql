-- Colunas e tabelas da integração Neumáticos Andrés (volume antigo).
-- Substitui os SQL avulso create_neumaticos_andres_integration.sql / create_supplier_api.sql.

alter table public.global_settings
  add column if not exists na_integration_enabled boolean default false,
  add column if not exists na_auto_fulfill boolean default true,
  add column if not exists na_auto_sync_stock boolean default false,
  add column if not exists na_use_consignee boolean default false,
  add column if not exists na_consignee_identifier text,
  add column if not exists na_consignee_type integer,
  add column if not exists na_api_login text,
  add column if not exists na_api_password_enc text,
  add column if not exists na_api_base_url text,
  add column if not exists na_api_test_mode boolean default true;

-- Escritas do painel (imagem antiga) fazem SET row_security=off como mecanidoc_app.
alter table public.global_settings disable row level security;

alter table public.products
  add column if not exists external_supplier text,
  add column if not exists external_product_id text,
  add column if not exists external_metadata jsonb default '{}'::jsonb,
  add column if not exists last_stock_sync_at timestamptz;

create index if not exists idx_products_external_supplier on public.products(external_supplier);

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

-- Imagem antiga: SET row_security=off como mecanidoc_app falha em qualquer tabela com RLS.
do $$
declare r record;
begin
  for r in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity
  loop
    execute format('alter table public.%I disable row level security', r.relname);
  end loop;
end
$$;

grant select, insert, update, delete on all tables in schema public to mecanidoc_app, mecanidoc_admin;
grant usage, select on all sequences in schema public to mecanidoc_app, mecanidoc_admin;
