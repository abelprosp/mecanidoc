-- Criar tabela de taxas configuráveis
create table if not exists public.taxes (
  id uuid default gen_random_uuid() primary key,
  name text not null, -- Nome da taxa (ex: "TVA", "Taxe Platforme", "Taxe Environnementale")
  description text, -- Descrição opcional
  rate numeric not null, -- Taxa percentual (ex: 20.0 para 20%)
  is_percentage boolean default true, -- true = percentual, false = valor fixo
  is_active boolean default true,
  applies_to text default 'all', -- 'all', 'auto', 'moto', 'camion', 'tracteur'
  sort_order integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Índices
create index if not exists idx_taxes_active on public.taxes(is_active, sort_order);

-- RLS
alter table public.taxes enable row level security;

-- Política: Todos podem ler taxas ativas
create policy "Public read access" on public.taxes 
  for select 
  using (is_active = true);

-- Política: Apenas master pode gerenciar
create policy "Master write access" on public.taxes 
  for all 
  using (
    exists (
      select 1 from public.profiles 
      where id = auth.uid() and role = 'master'
    )
  );

-- Inserir taxas padrão
insert into public.taxes (name, description, rate, is_percentage, is_active, sort_order) values
  ('TVA', 'Taxe sur la valeur ajoutée', 20.0, true, true, 10),
  ('Taxe Platforme', 'Commission de la plateforme', 5.0, true, true, 20)
on conflict do nothing;
