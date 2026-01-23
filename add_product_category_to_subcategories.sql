-- Adicionar campo product_category_filter na tabela menu_subcategories
alter table public.menu_subcategories
add column if not exists product_category_filter text;

-- Atualizar subcategorias existentes baseado no parent_category
update public.menu_subcategories
set product_category_filter = 
  case 
    when parent_category = 'Auto' then 'Auto'
    when parent_category = 'Moto' then 'Moto'
    when parent_category = 'Camion' then 'Camion'
    when parent_category = 'Tracteur' then 'Tracteurs'
    else 'Auto'
  end
where product_category_filter is null;

-- Comentário explicativo
comment on column public.menu_subcategories.product_category_filter is 'Categoria de produto a filtrar nesta subcategoria (Auto, Moto, Camion, Tracteurs)';
