-- Cria a tabela taxes e políticas de forma segura (pode ser executado mais de uma vez)
-- Se a policy já existir, é removida antes de ser criada de novo.

create extension if not exists pgcrypto;

create table if not exists public.taxes (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  rate numeric not null,
  is_percentage boolean default true,
  is_active boolean default true,
  applies_to text default 'all',
  sort_order integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

create index if not exists idx_taxes_active on public.taxes(is_active, sort_order);
alter table public.taxes enable row level security;

drop policy if exists "Public read access" on public.taxes;
create policy "Public read access" on public.taxes for select using (is_active = true);

drop policy if exists "Master write access" on public.taxes;
create policy "Master write access" on public.taxes for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'master')
);

insert into public.taxes (name, description, rate, is_percentage, is_active, sort_order)
select 'TVA', 'Taxe sur la valeur ajoutée', 20.0, true, true, 10 where not exists (select 1 from public.taxes where name = 'TVA')
union all
select 'Taxe Platforme', 'Commission de la plateforme', 5.0, true, true, 20 where not exists (select 1 from public.taxes where name = 'Taxe Platforme');
