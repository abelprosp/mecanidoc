-- =============================================================================
-- Simuler une commande (sans checkout / Stripe) — tests Admin Ventes & Fournisseur
-- Exécuter dans Supabase → SQL Editor (rôle postgres : RLS ignoré pour ces INSERT).
--
-- Prérequis : au moins 1 utilisateur dans auth.users et 1 produit actif.
-- Optionnel : colonnes orders (subtotal_amount, delivery_*, warranty_*) —
--             voir add_orders_checkout_details.sql / run_all_migrations.sql
-- =============================================================================

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
