
-- Tabela de Itens do Pedido (Order Items)
create table if not exists public.order_items (
  id uuid default gen_random_uuid() primary key,
  order_id uuid references public.orders(id) not null,
  product_id uuid references public.products(id) not null,
  quantity integer not null default 1,
  price numeric not null,
  garage_id uuid references public.garages(id),
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Habilitar RLS
alter table public.order_items enable row level security;

-- Políticas
create policy "Order items viewable by owner" 
  on public.order_items for select 
  using (exists (select 1 from public.orders where id = order_items.order_id and user_id = auth.uid()));

create policy "Order items viewable by master" 
  on public.order_items for select 
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'master'));

create policy "Order items viewable by linked garage" 
  on public.order_items for select 
  using (exists (select 1 from public.garages where id = order_items.garage_id and profile_id = auth.uid()));

create policy "Users can insert order items" 
  on public.order_items for insert 
  with check (exists (select 1 from public.orders where id = order_items.order_id and user_id = auth.uid()));
