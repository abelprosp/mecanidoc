-- Agenda réelle des garages (créneaux, capacité, rendez-vous liés à une commande).
-- Idempotent : init Docker + bash scripts/db-harden.sh

alter table public.garages
  add column if not exists slot_minutes integer not null default 60,
  add column if not exists daily_capacity integer not null default 8,
  add column if not exists opening_hours jsonb not null default '{
    "1":[["08:00","12:00"],["13:30","18:00"]],
    "2":[["08:00","12:00"],["13:30","18:00"]],
    "3":[["08:00","12:00"],["13:30","18:00"]],
    "4":[["08:00","12:00"],["13:30","18:00"]],
    "5":[["08:00","12:00"],["13:30","18:00"]],
    "6":[],
    "0":[]
  }'::jsonb;

create table if not exists public.garage_appointments (
  id uuid primary key default gen_random_uuid(),
  garage_id uuid not null references public.garages(id) on delete cascade,
  order_id uuid references public.orders(id) on delete cascade,
  order_item_id uuid references public.order_items(id) on delete set null,
  scheduled_at timestamptz,
  duration_minutes integer not null default 60,
  status text not null default 'pending'
    check (status in ('pending','scheduled','confirmed','done','cancelled','no_show')),
  customer_name text,
  customer_phone text,
  product_name text,
  quantity integer not null default 1,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_garage_appointments_garage_time
  on public.garage_appointments (garage_id, scheduled_at);
create index if not exists idx_garage_appointments_order
  on public.garage_appointments (order_id);

alter table public.garage_appointments enable row level security;

drop policy if exists garage_appointments_select on public.garage_appointments;
create policy garage_appointments_select on public.garage_appointments
  for select using (
    auth.is_master()
    or exists (select 1 from public.garages g where g.id = garage_id and g.profile_id = auth.uid())
    or exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
  );

drop policy if exists garage_appointments_update on public.garage_appointments;
create policy garage_appointments_update on public.garage_appointments
  for update using (
    auth.is_master()
    or exists (select 1 from public.garages g where g.id = garage_id and g.profile_id = auth.uid())
  ) with check (
    auth.is_master()
    or exists (select 1 from public.garages g where g.id = garage_id and g.profile_id = auth.uid())
  );

drop policy if exists garage_appointments_insert on public.garage_appointments;
create policy garage_appointments_insert on public.garage_appointments
  for insert with check (auth.is_privileged() or auth.is_master());
