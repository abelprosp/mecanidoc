
-- Adicionar coluna brand_id na tabela products para linkar com a tabela brands
alter table public.products
add column if not exists brand_id uuid references public.brands(id);

-- Atualizar a política de RLS para permitir que o Master gerencie marcas
-- (Já foi feito no create_brands_table.sql, mas reforçando se necessário)
