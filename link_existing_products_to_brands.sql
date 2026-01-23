-- Script para vincular produtos existentes às marcas baseado no campo brand (texto)
-- Este script atualiza produtos que têm brand preenchido mas não têm brand_id

-- Atualizar produtos que têm brand mas não têm brand_id
update public.products p
set brand_id = (
  select b.id 
  from public.brands b 
  where lower(trim(b.name)) = lower(trim(p.brand))
  limit 1
)
where p.brand_id is null 
  and p.brand is not null 
  and p.brand != '';

-- Verificar quantos produtos foram atualizados
select 
  count(*) as total_produtos,
  count(brand_id) as produtos_com_brand_id,
  count(*) - count(brand_id) as produtos_sem_brand_id
from public.products;
