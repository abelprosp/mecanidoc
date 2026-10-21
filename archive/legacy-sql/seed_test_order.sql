-- =============================================================================
-- Simuler une commande (sans checkout / Stripe) — tests Admin Ventes & Fournisseur
-- Exécuter dans Supabase → SQL Editor (rôle postgres : RLS ignoré pour ces INSERT).
--
-- Prérequis : au moins 1 utilisateur dans auth.users et 1 produit actif.
-- =============================================================================

-- Colonnes orders si la table date d’une ancienne migration (évite ERROR 42703)
alter table public.orders add column if not exists contact_name text;
alter table public.orders add column if not exists contact_phone text;
alter table public.orders add column if not exists contact_email text;
alter table public.orders add column if not exists shipping_address text;
alter table public.orders add column if not exists shipping_city text;
alter table public.orders add column if not exists shipping_zip text;
alter table public.orders add column if not exists shipping_country text;
alter table public.orders add column if not exists notes text;
alter table public.orders add column if not exists stripe_payment_intent_id text;
alter table public.orders add column if not exists stripe_customer_id text;
alter table public.orders add column if not exists payment_method text default 'stripe';
alter table public.orders add column if not exists payment_status text default 'pending';
alter table public.orders add column if not exists subtotal_amount numeric;
alter table public.orders add column if not exists delivery_fee numeric default 0;
alter table public.orders add column if not exists delivery_type text;
alter table public.orders add column if not exists warranty_included boolean default false;
alter table public.orders add column if not exists warranty_fee numeric default 0;

-- Table order_items (si absente — ERROR 42P01)
-- garage_id sans FK forcée : évite l’échec si public.garages n’existe pas encore
create table if not exists public.order_items (
  id uuid default gen_random_uuid() primary key,
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id),
  quantity integer not null default 1,
  price numeric not null,
  garage_id uuid,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

create index if not exists idx_order_items_order_id on public.order_items(order_id);
create index if not exists idx_order_items_product_id on public.order_items(product_id);

alter table public.order_items enable row level security;

drop policy if exists "Order items viewable by owner" on public.order_items;
create policy "Order items viewable by owner" on public.order_items
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id and o.user_id = auth.uid()
    )
  );

drop policy if exists "Order items viewable by master" on public.order_items;
create policy "Order items viewable by master" on public.order_items
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'master')
  );

drop policy if exists "Users can insert order items" on public.order_items;
create policy "Users can insert order items" on public.order_items
  for insert with check (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id and o.user_id = auth.uid()
    )
  );

do $pol$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'garages'
  ) then
    drop policy if exists "Order items viewable by linked garage" on public.order_items;
    create policy "Order items viewable by linked garage" on public.order_items
      for select using (
        exists (
          select 1 from public.garages g
          where g.id = order_items.garage_id and g.profile_id = auth.uid()
        )
      );
  end if;

  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'suppliers'
  ) then
    drop policy if exists "Order items viewable by product supplier" on public.order_items;
    create policy "Order items viewable by product supplier" on public.order_items
      for select using (
        exists (
          select 1 from public.products p
          where p.id = order_items.product_id
          and (
            p.supplier_user_id = auth.uid()
            or exists (
              select 1 from public.suppliers s
              where s.id = p.supplier_id and s.profile_id = auth.uid()
            )
          )
        )
      );
  end if;
end
$pol$;

grant usage on schema public to anon, authenticated;
grant all on public.order_items to anon, authenticated;
grant all on public.order_items to service_role;

notify pgrst, 'reload schema';

DO $$
DECLARE
  v_user_id uuid;
  v_product_id uuid;
  v_price numeric(12, 2);
  v_qty integer := 2;
  v_subtotal numeric(12, 2);
  v_delivery numeric(12, 2) := 10.00;
  v_warranty_unit numeric(12, 2) := 5.50;
  v_warranty_fee numeric(12, 2);
  v_warranty_on boolean := true;
  v_total numeric(12, 2);
  v_order_id uuid;
  v_garage_id uuid;
BEGIN
  -- Client : premier compte auth (modifier si besoin : WHERE email = '...')
  SELECT id INTO v_user_id
  FROM auth.users
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Aucun utilisateur dans auth.users. Créez un compte via l''app d''abord.';
  END IF;

  -- Produit : premier produit actif (sinon n''importe quel produit)
  SELECT id, COALESCE(base_price, 0)::numeric(12, 2)
  INTO v_product_id, v_price
  FROM public.products
  WHERE COALESCE(is_active, true) = true
  ORDER BY created_at ASC NULLS LAST
  LIMIT 1;

  IF v_product_id IS NULL THEN
    RAISE EXCEPTION 'Aucun produit dans public.products. Importez le catalogue d''abord.';
  END IF;

  IF v_price <= 0 THEN
    v_price := 89.90; -- prix fictif si base_price manquant
  END IF;

  v_subtotal := round(v_price * v_qty, 2);
  v_warranty_fee := CASE WHEN v_warranty_on THEN round(v_warranty_unit * v_qty, 2) ELSE 0 END;
  v_total := round(v_subtotal + v_delivery + v_warranty_fee, 2);

  -- Garage optionnel (première garage approuvée) pour tester la colonne garage_id
  SELECT g.id INTO v_garage_id
  FROM public.garages g
  WHERE COALESCE(g.is_approved, false) = true
  LIMIT 1;

  INSERT INTO public.orders (
    user_id,
    total_amount,
    status,
    payment_status,
    subtotal_amount,
    delivery_fee,
    delivery_type,
    warranty_included,
    warranty_fee,
    contact_name,
    contact_phone,
    contact_email,
    shipping_address,
    shipping_city,
    shipping_zip,
    shipping_country,
    notes
  ) VALUES (
    v_user_id,
    v_total,
    'completed',
    'paid',
    v_subtotal,
    v_delivery,
    'fast',
    v_warranty_on,
    v_warranty_fee,
    'Client Test SQL',
    '+33 6 12 34 56 78',
    'client-test-sql@mecanidoc.local',
    '10 rue du Test',
    'Paris',
    '75001',
    'France',
    'Commande de test insérée via seed_test_order.sql (pas de Stripe).'
  )
  RETURNING id INTO v_order_id;

  INSERT INTO public.order_items (
    order_id,
    product_id,
    quantity,
    price,
    garage_id
  ) VALUES (
    v_order_id,
    v_product_id,
    v_qty,
    v_price,
    v_garage_id
  );

  RAISE NOTICE 'Commande test créée : order_id = %, user_id = %, product_id = %, total = %',
    v_order_id, v_user_id, v_product_id, v_total;
END $$;

-- Vérification rapide (optionnel, décommenter)
-- SELECT o.id, o.total_amount, o.payment_status, o.warranty_included, o.delivery_type,
--        oi.quantity, oi.price, p.name
-- FROM public.orders o
-- JOIN public.order_items oi ON oi.order_id = o.id
-- JOIN public.products p ON p.id = oi.product_id
-- ORDER BY o.created_at DESC
-- LIMIT 3;
