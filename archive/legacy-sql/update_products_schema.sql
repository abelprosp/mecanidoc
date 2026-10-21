-- Atualizar tabela de Produtos para suportar importação CSV completa
alter table public.products
add column if not exists sale_price numeric,
add column if not exists brand text,
add column if not exists ean text,
add column if not exists shipping_cost numeric default 0,
add column if not exists supplier_user_id uuid references auth.users(id), -- Vincula diretamente ao usuário que subiu
add column if not exists labels jsonb; -- Para armazenar fuel, wet, noise, class, url

-- Política para permitir que usuários vejam/editem seus próprios produtos (baseado no user_id direto ou supplier profile)
create policy "Users can insert own products"
  on public.products for insert
  with check ( auth.uid() = supplier_user_id );

create policy "Users can update own products"
  on public.products for update
  using ( auth.uid() = supplier_user_id );

-- Garantir que specs seja usado para largura, altura, aro, carga, velocidade, clima
comment on column public.products.specs is 'Stores JSON: {width, height, diameter, load, speed, season, runflat, etc}';
