-- Remove a foreign key de product_id em order_items para evitar erro ao inserir.
-- Execute uma vez no Supabase SQL Editor se aparecer "violates foreign key constraint order_items_product_id_fkey".

alter table public.order_items drop constraint if exists order_items_product_id_fkey;
