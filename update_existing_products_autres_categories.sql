-- Script para atualizar produtos existentes que podem ter autres_categories como string
-- Este script converte strings para arrays no campo specs JSONB

-- Primeiro, vamos verificar produtos que podem ter autres_categories como string
-- e atualizar para o formato array correto

-- Nota: Este script precisa ser executado manualmente ou adaptado conforme necessário
-- pois requer verificação caso a caso

-- Exemplo de atualização (descomente e ajuste conforme necessário):
/*
UPDATE public.products
SET specs = jsonb_set(
  specs,
  '{autres_categories}',
  to_jsonb(string_to_array(specs->>'autres_categories', ','))
)
WHERE specs->>'autres_categories' IS NOT NULL
  AND jsonb_typeof(specs->'autres_categories') = 'string';
*/

-- Para verificar produtos com autres_categories:
SELECT 
  id,
  name,
  specs->>'autres_categories' as autres_categories_atual,
  jsonb_typeof(specs->'autres_categories') as tipo_atual
FROM public.products
WHERE specs->>'autres_categories' IS NOT NULL
LIMIT 10;
