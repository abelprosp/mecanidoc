-- Tabela para armazenar subcategorias do menu baseadas em pa_tipo do CSV
create table if not exists public.menu_subcategories (
  id uuid default gen_random_uuid() primary key,
  parent_category text not null, -- 'Auto', 'Moto', 'Camion', 'Tracteur'
  name text not null, -- Nome da subcategoria (vem do pa_tipo)
  slug text not null, -- Slug para URL
  icon_name text, -- Nome do ícone do lucide-react (opcional)
  sort_order integer default 0,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now()),
  unique(parent_category, slug)
);

-- Índice para busca rápida
create index if not exists idx_menu_subcategories_parent on public.menu_subcategories(parent_category, is_active);

alter table public.menu_subcategories enable row level security;

-- Policies
create policy "Public read access" on public.menu_subcategories for select using (is_active = true);

create policy "Master write access" on public.menu_subcategories for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'master')
);

-- Função para gerar slug a partir do nome
create or replace function generate_slug(text) returns text as $$
  select lower(
    regexp_replace(
      regexp_replace($1, '[^a-zA-Z0-9\s]', '', 'g'),
      '\s+', '-', 'g'
    )
  );
$$ language sql immutable;
