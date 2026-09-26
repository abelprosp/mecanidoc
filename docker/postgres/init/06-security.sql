-- =============================================================================
-- MecaniDoc — Endurecimento de segurança e integridade da compra
--
-- Idempotente. Corre automaticamente em bases novas (init) e pode ser aplicado a
-- bases existentes com `bash scripts/db-harden.sh`.
--
-- Conteúdo:
--   1. Funções auxiliares (auth.is_master / auth.is_privileged)
--   2. RLS ativo em TODAS as tabelas (default deny) + políticas corrigidas
--   3. Triggers que impedem escalada de privilégios (papel, aprovações, saldos)
--   4. Integridade da encomenda (FK restaurada, imutabilidade após pagamento, stock)
--   5. Colunas de configuração comercial e de orçamento
--   6. Recuperação de password
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Funções auxiliares
-- -----------------------------------------------------------------------------
-- SECURITY DEFINER: corre como dono (superuser) para não recursar nas políticas de profiles.
create or replace function auth.is_master()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'master'
  );
$$;

-- Verdadeiro para master OU para código de servidor elevado (SET ROLE mecanidoc_admin,
-- superuser, ou row_security desligado). Usado pelos triggers de proteção.
create or replace function auth.is_privileged()
returns boolean
language sql
stable
as $$
  select auth.is_master()
      or exists (select 1 from pg_roles where rolname = current_user and (rolsuper or rolbypassrls))
      or coalesce(current_setting('row_security', true), 'on') = 'off';
$$;

-- -----------------------------------------------------------------------------
-- 2. RLS em todas as tabelas
-- -----------------------------------------------------------------------------
-- Tabelas sem políticas ficam acessíveis apenas ao papel administrativo (BYPASSRLS).
alter table public.users enable row level security;
alter table public.suppliers enable row level security;
alter table public.companies enable row level security;
alter table public.stripe_webhook_events enable row level security;
alter table public.support_conversations enable row level security;
alter table public.support_messages enable row level security;
alter table public.support_email_threads enable row level security;
alter table public.support_email_messages enable row level security;

-- profiles: leitura própria ou master (antes: pública)
drop policy if exists "Public profiles are viewable by everyone" on public.profiles;
drop policy if exists "Profiles readable by owner or master" on public.profiles;
create policy "Profiles readable by owner or master" on public.profiles
  for select using (id = auth.uid() or auth.is_master());

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "Master can update any profile" on public.profiles;
create policy "Master can update any profile" on public.profiles
  for update using (auth.is_master()) with check (auth.is_master());

drop policy if exists "Master can insert profiles" on public.profiles;
create policy "Master can insert profiles" on public.profiles
  for insert with check (auth.is_master());

-- global_settings: master já tem "for all"; garantir with check
drop policy if exists "Settings editable by master only" on public.global_settings;
create policy "Settings editable by master only" on public.global_settings
  for all using (auth.is_master()) with check (auth.is_master());

-- products: só fornecedores/master inserem (antes: qualquer autenticado)
drop policy if exists "Users can insert own products" on public.products;
create policy "Suppliers can insert own products" on public.products
  for insert with check (
    supplier_user_id = auth.uid()
    and exists (select 1 from public.profiles where id = auth.uid() and role in ('supplier', 'master'))
  );
drop policy if exists "Users can update own products" on public.products;
create policy "Users can update own products" on public.products
  for update using (supplier_user_id = auth.uid()) with check (supplier_user_id = auth.uid());

-- promotions: remover escrita pública; leitura completa só master
drop policy if exists "Authenticated users can read all promotions" on public.promotions;
drop policy if exists "Authenticated users can insert promotions" on public.promotions;
drop policy if exists "Authenticated users can update promotions" on public.promotions;
drop policy if exists "Authenticated users can delete promotions" on public.promotions;
drop policy if exists "Master can manage promotions" on public.promotions;
create policy "Master can manage promotions" on public.promotions
  for all using (auth.is_master()) with check (auth.is_master());

-- garages: inserção passa a ser feita pelo servidor no registo
drop policy if exists "Garages can insert own data" on public.garages;
drop policy if exists "Master can insert garages" on public.garages;
create policy "Master can insert garages" on public.garages
  for insert with check (auth.is_master());

-- suppliers
drop policy if exists "Suppliers readable by owner or master" on public.suppliers;
create policy "Suppliers readable by owner or master" on public.suppliers
  for select using (profile_id = auth.uid() or auth.is_master());
drop policy if exists "Supplier owner can update own" on public.suppliers;
create policy "Supplier owner can update own" on public.suppliers
  for update using (profile_id = auth.uid()) with check (profile_id = auth.uid());
drop policy if exists "Master can manage suppliers" on public.suppliers;
create policy "Master can manage suppliers" on public.suppliers
  for all using (auth.is_master()) with check (auth.is_master());

-- companies
drop policy if exists "Companies readable by owner or master" on public.companies;
create policy "Companies readable by owner or master" on public.companies
  for select using (profile_id = auth.uid() or auth.is_master());
drop policy if exists "Company owner can update own" on public.companies;
create policy "Company owner can update own" on public.companies
  for update using (profile_id = auth.uid()) with check (profile_id = auth.uid());
drop policy if exists "Master can manage companies" on public.companies;
create policy "Master can manage companies" on public.companies
  for all using (auth.is_master()) with check (auth.is_master());

-- orders / order_items: criação exclusivamente no servidor (rota de checkout)
drop policy if exists "Users can create orders" on public.orders;
drop policy if exists "Users can insert order items" on public.order_items;

-- -----------------------------------------------------------------------------
-- 3. Triggers anti-escalada
-- -----------------------------------------------------------------------------
create or replace function public.guard_profile_columns()
returns trigger
language plpgsql
as $$
begin
  if auth.is_privileged() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    if new.role is distinct from 'customer' then
      raise exception 'Création de profil avec ce rôle non autorisée' using errcode = '42501';
    end if;
    return new;
  end if;
  if new.id is distinct from old.id
     or new.role is distinct from old.role
     or new.supplier_promotion_pending is distinct from old.supplier_promotion_pending
     or new.email is distinct from old.email then
    raise exception 'Modification de colonnes protégées du profil non autorisée' using errcode = '42501';
  end if;
  return new;
end
$$;
drop trigger if exists trg_guard_profile_columns on public.profiles;
create trigger trg_guard_profile_columns
  before insert or update on public.profiles
  for each row execute function public.guard_profile_columns();

create or replace function public.guard_garage_columns()
returns trigger
language plpgsql
as $$
begin
  if auth.is_privileged() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    if coalesce(new.is_approved, false) then
      raise exception 'Approbation réservée à l''administrateur' using errcode = '42501';
    end if;
    new.commission_balance := 0;
    return new;
  end if;
  if new.is_approved is distinct from old.is_approved
     or new.commission_balance is distinct from old.commission_balance
     or new.profile_id is distinct from old.profile_id then
    raise exception 'Modification de colonnes protégées du garage non autorisée' using errcode = '42501';
  end if;
  return new;
end
$$;
drop trigger if exists trg_guard_garage_columns on public.garages;
create trigger trg_guard_garage_columns
  before insert or update on public.garages
  for each row execute function public.guard_garage_columns();

create or replace function public.guard_supplier_columns()
returns trigger
language plpgsql
as $$
begin
  if auth.is_privileged() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.is_approved := false;
    return new;
  end if;
  if new.is_approved is distinct from old.is_approved
     or new.profile_id is distinct from old.profile_id then
    raise exception 'Modification de colonnes protégées du fournisseur non autorisée' using errcode = '42501';
  end if;
  return new;
end
$$;
drop trigger if exists trg_guard_supplier_columns on public.suppliers;
create trigger trg_guard_supplier_columns
  before insert or update on public.suppliers
  for each row execute function public.guard_supplier_columns();

create or replace function public.guard_company_columns()
returns trigger
language plpgsql
as $$
begin
  if auth.is_privileged() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.discount_tier := 0;
    return new;
  end if;
  if new.discount_tier is distinct from old.discount_tier
     or new.profile_id is distinct from old.profile_id then
    raise exception 'Modification de la remise entreprise non autorisée' using errcode = '42501';
  end if;
  return new;
end
$$;
drop trigger if exists trg_guard_company_columns on public.companies;
create trigger trg_guard_company_columns
  before insert or update on public.companies
  for each row execute function public.guard_company_columns();

-- -----------------------------------------------------------------------------
-- 4. Integridade da encomenda
-- -----------------------------------------------------------------------------
-- Colunas de orçamento (calculadas no servidor)
alter table public.orders
  add column if not exists currency text not null default 'eur',
  add column if not exists tax_amount numeric default 0,
  add column if not exists discount_amount numeric default 0,
  add column if not exists installation_fee numeric default 0,
  add column if not exists paid_at timestamptz,
  add column if not exists quote_snapshot jsonb,
  add column if not exists supplier_fulfillment_attempts integer default 0,
  add column if not exists supplier_fulfillment_last_error text;

alter table public.order_items
  add column if not exists product_name text,
  add column if not exists unit_base_price numeric,
  add column if not exists installation_price numeric default 0,
  add column if not exists line_total numeric;

comment on column public.orders.quote_snapshot is 'Orçamento calculado no servidor no momento da encomenda (produtos, taxas, frete, desconto).';
comment on column public.order_items.price is 'Preço unitário final (com taxas) cobrado ao cliente.';

-- FK order_items.product_id (era removida em runtime pela antiga rota /api/checkout/order-items)
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'order_items_product_id_fkey'
  ) then
    alter table public.order_items
      add constraint order_items_product_id_fkey
      foreign key (product_id) references public.products(id) not valid;
  end if;
end
$$;

-- Estados considerados "fechados": montantes e itens não podem mudar.
create or replace function public.order_is_locked(p_payment_status text, p_status text)
returns boolean
language sql
immutable
as $$
  select coalesce(p_payment_status, '') in ('paid', 'refunded', 'partially_refunded')
      or coalesce(p_status, '') in ('paid', 'processing', 'shipped', 'delivered', 'refunded');
$$;

create or replace function public.guard_paid_order()
returns trigger
language plpgsql
as $$
begin
  if public.order_is_locked(old.payment_status, old.status) then
    if new.user_id        is distinct from old.user_id
    or new.total_amount   is distinct from old.total_amount
    or new.subtotal_amount is distinct from old.subtotal_amount
    or new.delivery_fee   is distinct from old.delivery_fee
    or new.warranty_fee   is distinct from old.warranty_fee
    or new.tax_amount     is distinct from old.tax_amount
    or new.discount_amount is distinct from old.discount_amount
    or new.installation_fee is distinct from old.installation_fee
    or new.currency       is distinct from old.currency
    or new.delivery_type  is distinct from old.delivery_type
    or new.warranty_included is distinct from old.warranty_included then
      raise exception 'Commande payée : les montants ne sont plus modifiables' using errcode = 'P0001';
    end if;
  end if;
  if new.payment_status = 'paid' and coalesce(old.payment_status, '') <> 'paid' and new.paid_at is null then
    new.paid_at := now();
  end if;
  return new;
end
$$;
drop trigger if exists trg_guard_paid_order on public.orders;
create trigger trg_guard_paid_order
  before update on public.orders
  for each row execute function public.guard_paid_order();

create or replace function public.guard_paid_order_items()
returns trigger
language plpgsql
as $$
declare
  v_order_id uuid := coalesce(new.order_id, old.order_id);
  v_locked boolean;
begin
  select public.order_is_locked(payment_status, status) into v_locked
  from public.orders where id = v_order_id;
  if coalesce(v_locked, false) then
    raise exception 'Commande payée : les articles ne sont plus modifiables' using errcode = 'P0001';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end
$$;
drop trigger if exists trg_guard_paid_order_items on public.order_items;
create trigger trg_guard_paid_order_items
  before insert or update or delete on public.order_items
  for each row execute function public.guard_paid_order_items();

-- Decrementa stock uma única vez, na transição para "paid".
create or replace function public.decrement_stock_on_paid()
returns trigger
language plpgsql
as $$
begin
  if new.payment_status = 'paid' and coalesce(old.payment_status, '') <> 'paid' then
    update public.products p
       set stock_quantity = greatest(0, coalesce(p.stock_quantity, 0) - oi.quantity)
      from public.order_items oi
     where oi.order_id = new.id and oi.product_id = p.id;
  end if;
  return new;
end
$$;
drop trigger if exists trg_decrement_stock_on_paid on public.orders;
create trigger trg_decrement_stock_on_paid
  after update of payment_status on public.orders
  for each row execute function public.decrement_stock_on_paid();

create index if not exists idx_orders_user_created on public.orders(user_id, created_at desc);
create index if not exists idx_order_items_order on public.order_items(order_id);
create index if not exists idx_order_items_product on public.order_items(product_id);
create index if not exists idx_order_items_garage on public.order_items(garage_id) where garage_id is not null;

-- -----------------------------------------------------------------------------
-- 5. Configuração comercial (frete, seguro) usada pelo orçamento do servidor
-- -----------------------------------------------------------------------------
alter table public.global_settings
  add column if not exists fast_delivery_fee numeric default 19.90,
  add column if not exists fast_delivery_fee_bulk numeric default 29.90,
  add column if not exists fast_delivery_bulk_min_qty integer default 4,
  add column if not exists warranty_fee numeric default 5.50,
  add column if not exists free_standard_delivery_min_qty integer default 2;

comment on column public.global_settings.delivery_base_fee is 'Livraison standard pour moins de free_standard_delivery_min_qty pneus';
comment on column public.global_settings.fast_delivery_fee is 'Livraison express (jusqu''à fast_delivery_bulk_min_qty - 1 pneus)';
comment on column public.global_settings.fast_delivery_fee_bulk is 'Livraison express à partir de fast_delivery_bulk_min_qty pneus';
comment on column public.global_settings.warranty_fee is 'Assurance crevaison, par pneu';

-- Garantir uma linha de configurações
insert into public.global_settings (id)
select gen_random_uuid()
where not exists (select 1 from public.global_settings);

-- -----------------------------------------------------------------------------
-- 6. Recuperação de password
-- -----------------------------------------------------------------------------
create table if not exists public.password_reset_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_password_reset_tokens_user on public.password_reset_tokens(user_id);
alter table public.password_reset_tokens enable row level security;

alter table public.users
  add column if not exists password_changed_at timestamptz;

-- -----------------------------------------------------------------------------
-- 7. Sessões revogáveis, verificação de e-mail e MFA (TOTP)
-- -----------------------------------------------------------------------------
-- Cada JWT de sessão transporta `session_version`; incrementar invalida todas as sessões.
alter table public.users
  add column if not exists session_version integer not null default 1,
  add column if not exists mfa_enabled boolean not null default false,
  add column if not exists mfa_secret_enc text,
  add column if not exists mfa_recovery_hashes text[] not null default '{}',
  add column if not exists mfa_enabled_at timestamptz;

-- Novos utilizadores começam por confirmar o e-mail (contas existentes mantêm-se confirmadas).
alter table public.users alter column email_confirmed_at drop default;

create table if not exists public.email_verification_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_email_verification_tokens_user on public.email_verification_tokens(user_id);
alter table public.email_verification_tokens enable row level security;

-- Ligações a fornecedores externos (API) — credenciais cifradas pela app (AUTH_SECRET).
create table if not exists public.supplier_connections (
  id uuid primary key default gen_random_uuid(),
  provider text not null,                       -- chave do preset (ex.: neumaticos_andres, generic_csv, generic_rest)
  name text not null,
  is_active boolean not null default true,
  config jsonb not null default '{}'::jsonb,    -- campos não secretos (URLs, margens, categorias…)
  secrets_enc text,                             -- JSON cifrado com credenciais
  auto_sync boolean not null default false,
  sync_interval_minutes integer not null default 1440,
  last_sync_at timestamptz,
  last_sync_status text,                        -- ok | error | running
  last_sync_summary jsonb,
  last_error text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.supplier_connections enable row level security;
drop policy if exists "supplier_connections master" on public.supplier_connections;
create policy "supplier_connections master" on public.supplier_connections
  for all using (auth.is_master()) with check (auth.is_master());

create table if not exists public.supplier_connection_runs (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.supplier_connections(id) on delete cascade,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running',       -- running | ok | error
  summary jsonb,
  error text
);
create index if not exists idx_supplier_connection_runs_conn on public.supplier_connection_runs(connection_id, started_at desc);
alter table public.supplier_connection_runs enable row level security;
drop policy if exists "supplier_connection_runs master" on public.supplier_connection_runs;
create policy "supplier_connection_runs master" on public.supplier_connection_runs
  for select using (auth.is_master());

-- Origem do produto (para sincronizações incrementais por ligação)
alter table public.products
  add column if not exists supplier_connection_id uuid references public.supplier_connections(id) on delete set null,
  add column if not exists supplier_sku text,
  add column if not exists updated_at timestamptz;
create index if not exists idx_products_connection_sku on public.products(supplier_connection_id, supplier_sku);
