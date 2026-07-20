-- API de fornecedores (chaves + credenciais de integração externa)
-- Execute no SQL Editor / migração após o schema base.

-- Chaves de API para fornecedores enviarem/consultarem produtos no MecaniDoc
create table if not exists public.supplier_api_keys (
  id uuid default gen_random_uuid() primary key,
  supplier_id uuid references public.suppliers(id) on delete cascade not null,
  name text not null default 'Chave API',
  key_prefix text not null,
  key_hash text not null unique,
  is_active boolean default true,
  last_used_at timestamptz,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  revoked_at timestamptz
);

create index if not exists idx_supplier_api_keys_supplier_id on public.supplier_api_keys(supplier_id);
create index if not exists idx_supplier_api_keys_prefix on public.supplier_api_keys(key_prefix);

alter table public.supplier_api_keys enable row level security;

drop policy if exists "Supplier can view own api keys" on public.supplier_api_keys;
create policy "Supplier can view own api keys" on public.supplier_api_keys
  for select using (
    exists (
      select 1 from public.suppliers s
      where s.id = supplier_api_keys.supplier_id
        and s.profile_id = auth.uid()
    )
  );

drop policy if exists "Master can manage all api keys" on public.supplier_api_keys;
create policy "Master can manage all api keys" on public.supplier_api_keys
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'master')
  );

-- Credenciais da API externa (Neumáticos Andrés) configuráveis pelo painel admin
alter table public.global_settings
  add column if not exists na_api_login text,
  add column if not exists na_api_password_enc text,
  add column if not exists na_api_base_url text,
  add column if not exists na_api_test_mode boolean default true;

comment on column public.global_settings.na_api_login is 'Login API Neumáticos Andrés (painel)';
comment on column public.global_settings.na_api_password_enc is 'Password API cifrada (AUTH_SECRET)';
comment on column public.global_settings.na_api_base_url is 'Base URL API (ex: https://backend.genasa.es)';
comment on column public.global_settings.na_api_test_mode is 'Modo teste da API NA';

-- Índice útil para upsert por referência externa do fornecedor
create unique index if not exists idx_products_supplier_external_product
  on public.products (supplier_id, external_product_id)
  where supplier_id is not null and external_product_id is not null and trim(external_product_id) <> '';
