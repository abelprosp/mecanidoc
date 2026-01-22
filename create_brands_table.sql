
-- Tabela de Marcas
create table if not exists public.brands (
  id uuid default gen_random_uuid() primary key,
  name text not null unique,
  logo_url text,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Habilitar RLS
alter table public.brands enable row level security;

-- Políticas
create policy "Brands viewable by everyone" 
  on public.brands for select 
  using (true);

create policy "Brands editable by master only" 
  on public.brands for all 
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'master'));
