
-- Tabela de Pedidos (Orders)
create table if not exists public.orders (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  total_amount numeric not null,
  status text default 'pending', -- pending, paid, shipped, delivered, cancelled
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Habilitar RLS
alter table public.orders enable row level security;

-- Políticas de Segurança
create policy "Orders viewable by own user" 
  on public.orders for select 
  using (auth.uid() = user_id);

create policy "Orders viewable by master" 
  on public.orders for select 
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'master'));

-- Política para criar pedidos (qualquer usuário autenticado)
create policy "Users can create orders" 
  on public.orders for insert 
  with check (auth.uid() = user_id);
