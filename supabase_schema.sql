-- 1. Criação dos TIPOS de Usuários (Roles)
create type user_role as enum ('master', 'garage', 'supplier', 'company', 'customer');

-- 2. Tabela de Perfis (Estende a tabela auth.users do Supabase)
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text,
  role user_role default 'customer',
  full_name text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Tabela de Configurações Globais (Só o Master mexe)
create table public.global_settings (
  id uuid default gen_random_uuid() primary key,
  platform_fee_percentage numeric default 5.0, -- Taxa da plataforma
  default_tax_rate numeric default 20.0, -- Imposto padrão
  delivery_base_fee numeric default 10.0,
  promotional_banner_url text,
  is_maintenance_mode boolean default false,
  updated_by uuid references public.profiles(id)
);

-- 4. Tabela de Garagens (Parceiros de Instalação)
create table public.garages (
  id uuid default gen_random_uuid() primary key,
  profile_id uuid references public.profiles(id) not null,
  name text not null,
  address text not null,
  latitude numeric,
  longitude numeric,
  installation_price numeric not null,
  is_approved boolean default false, -- Master precisa aprovar
  commission_balance numeric default 0.0, -- Créditos de instalação
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 5. Tabela de Fornecedores (Suppliers)
create table public.suppliers (
  id uuid default gen_random_uuid() primary key,
  profile_id uuid references public.profiles(id) not null,
  company_name text not null,
  vat_number text,
  is_approved boolean default false, -- Master precisa aprovar
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 6. Tabela de Empresas (Clientes B2B com desconto)
create table public.companies (
  id uuid default gen_random_uuid() primary key,
  profile_id uuid references public.profiles(id) not null,
  company_name text not null,
  discount_tier numeric default 5.0, -- Desconto percentual padrão
  vat_number text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 7. Produtos (Vinculados a Fornecedores ou ao Master)
create table public.products (
  id uuid default gen_random_uuid() primary key,
  supplier_id uuid references public.suppliers(id), -- Se null, é produto próprio da MecaniDoc
  name text not null,
  description text,
  base_price numeric not null,
  stock_quantity integer default 0,
  category text, -- 'auto', 'moto', 'camion', 'agri'
  specs jsonb, -- Detalhes técnicos (largura, aro, etc)
  images text[],
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Trigger para criar perfil automaticamente ao cadastrar
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', 'customer');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- HABILITAR RLS (Row Level Security) - SEGURANÇA
alter table public.profiles enable row level security;
alter table public.global_settings enable row level security;
alter table public.products enable row level security;
alter table public.garages enable row level security;

-- POLÍTICAS DE SEGURANÇA (EXEMPLOS)

-- Perfis: Todos podem ler seus próprios dados. Master pode ler tudo.
create policy "Public profiles are viewable by everyone"
  on profiles for select
  using ( true );

create policy "Users can update own profile"
  on profiles for update
  using ( auth.uid() = id );

-- Configurações: Apenas Master pode editar. Todos podem ler.
create policy "Settings viewable by everyone"
  on global_settings for select
  using ( true );

create policy "Settings editable by master only"
  on global_settings for all
  using ( 
    exists ( select 1 from profiles where id = auth.uid() and role = 'master' )
  );

-- Produtos:
-- Leitura: Pública
create policy "Products are viewable by everyone"
  on products for select
  using ( true );

-- Escrita (Insert/Update/Delete):
-- Master: Pode tudo.
-- Supplier: Pode editar APENAS seus produtos.
create policy "Suppliers can manage own products"
  on products for all
  using (
    exists (
      select 1 from suppliers 
      where id = products.supplier_id 
      and profile_id = auth.uid()
      and is_approved = true
    )
  );

create policy "Master can manage all products"
  on products for all
  using (
    exists ( select 1 from profiles where id = auth.uid() and role = 'master' )
  );
