-- Adicionar coluna pa_tipo na tabela products se não existir
alter table public.products
add column if not exists pa_tipo text;

-- Comentário explicativo
comment on column public.products.pa_tipo is 'Tipo de produto do CSV (usado para criar subcategorias do menu e filtrar produtos)';

-- Criar índice para melhorar performance nas consultas
create index if not exists idx_products_pa_tipo on public.products(pa_tipo) where pa_tipo is not null;
