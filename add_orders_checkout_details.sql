-- Détails checkout (sous-total pneus, livraison, assurance/garantie) pour admin & fournisseur
alter table public.orders
  add column if not exists subtotal_amount numeric,
  add column if not exists delivery_fee numeric default 0,
  add column if not exists delivery_type text,
  add column if not exists warranty_included boolean default false,
  add column if not exists warranty_fee numeric default 0;

comment on column public.orders.subtotal_amount is 'Montant pneus seuls (hors livraison / garantie)';
comment on column public.orders.delivery_type is 'normal | fast';
comment on column public.orders.warranty_included is 'Assurance / garantie crevaison (par unité) acceptée';

-- Fournisseur : voir les commandes qui contiennent au moins un de ses produits
drop policy if exists "Orders viewable by supplier with products in order" on public.orders;
create policy "Orders viewable by supplier with products in order" on public.orders
  for select using (
    exists (
      select 1 from public.order_items oi
      inner join public.products p on p.id = oi.product_id
      where oi.order_id = orders.id
      and (
        p.supplier_user_id = auth.uid()
        or exists (
          select 1 from public.suppliers s
          where s.id = p.supplier_id and s.profile_id = auth.uid()
        )
      )
    )
  );

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

drop policy if exists "Garages viewable when linked to supplier order item" on public.garages;
create policy "Garages viewable when linked to supplier order item" on public.garages
  for select using (
    exists (
      select 1 from public.order_items oi
      inner join public.products p on p.id = oi.product_id
      where oi.garage_id = garages.id
      and (
        p.supplier_user_id = auth.uid()
        or exists (
          select 1 from public.suppliers s
          where s.id = p.supplier_id and s.profile_id = auth.uid()
        )
      )
    )
  );
