-- =============================================================================
-- Migração: trocar domínio antigo (mecanidoc.com) pelo novo host na Hostinger
-- em URLs guardadas no array `products.images` (importação CSV).
--
-- Novo site: https://mecanidoc-com-442258.hostingersite.com/
-- (o script reescreve o host; caminhos como /wp-content/... mantêm-se.)
--
-- Como usar (Supabase SQL Editor ou psql):
--   1) Execute o bloco "PRÉ-VISUALIZAÇÃO" e confira as linhas.
--   2) BEGIN; execute o UPDATE; verifique com SELECT; COMMIT; ou ROLLBACK;
-- =============================================================================

-- Novo host (editar aqui se mudar de novo): sem barra final para não duplicar "/" no path
-- Função auxiliar (pode apagar depois com: DROP FUNCTION IF EXISTS public._fix_mecanidoc_image_url(text);)
CREATE OR REPLACE FUNCTION public._fix_mecanidoc_image_url(url text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN url IS NULL OR btrim(url) = '' THEN url
    ELSE
      -- URLs protocol-relative: //mecanidoc.com/...
      regexp_replace(
        -- URLs http(s)://[www.]mecanidoc.com/...
        regexp_replace(
          btrim(url),
          '^https?://(www\.)?mecanidoc\.com',
          'https://mecanidoc-com-442258.hostingersite.com',
          'i'
        ),
        '^//(www\.)?mecanidoc\.com',
        'https://mecanidoc-com-442258.hostingersite.com',
        'i'
      )
  END;
$$;

-- -----------------------------------------------------------------------------
-- PRÉ-VISUALIZAÇÃO: produtos que ainda referenciam o domínio antigo
-- -----------------------------------------------------------------------------
SELECT p.id,
       p.name,
       p.images AS images_antes,
       (
         SELECT array_agg(public._fix_mecanidoc_image_url(elem) ORDER BY ord)
         FROM unnest(p.images) WITH ORDINALITY AS t(elem, ord)
       ) AS images_depois
FROM public.products p
WHERE p.images IS NOT NULL
  AND cardinality(p.images) > 0
  AND EXISTS (
    SELECT 1
    FROM unnest(p.images) AS u(url)
    WHERE url ~* 'mecanidoc\.com'
      AND url !~* 'mecanidoc-com-442258\.hostingersite\.com'
  )
ORDER BY p.name
LIMIT 200;

-- -----------------------------------------------------------------------------
-- ATUALIZAÇÃO: coluna images (text[])
-- (No Supabase: pode envolver em BEGIN; … COMMIT; manualmente se quiser testar com ROLLBACK.)
-- -----------------------------------------------------------------------------
UPDATE public.products p
SET images = (
  SELECT COALESCE(
           array_agg(public._fix_mecanidoc_image_url(elem) ORDER BY ord),
           ARRAY[]::text[]
         )
  FROM unnest(p.images) WITH ORDINALITY AS t(elem, ord)
)
WHERE p.images IS NOT NULL
  AND cardinality(p.images) > 0
  AND EXISTS (
    SELECT 1
    FROM unnest(p.images) AS u(url)
    WHERE url ~* 'mecanidoc\.com'
      AND url !~* 'mecanidoc-com-442258\.hostingersite\.com'
  );

-- Verificação pós-update (opcional):
-- SELECT id, name, unnest(images) AS url FROM public.products
-- WHERE EXISTS (SELECT 1 FROM unnest(images) u WHERE u ~* 'mecanidoc\.com' AND u !~* 'hostingersite\.com');

-- -----------------------------------------------------------------------------
-- Opcional: logos de marcas (se também vieram do mesmo domínio)
-- -----------------------------------------------------------------------------
-- UPDATE public.brands
-- SET logo_url = public._fix_mecanidoc_image_url(logo_url)
-- WHERE logo_url IS NOT NULL
--   AND logo_url ~* 'mecanidoc\.com'
--   AND logo_url !~* 'mecanidoc-com-442258\.hostingersite\.com';

-- -----------------------------------------------------------------------------
-- Opcional: banner promocional em global_settings
-- -----------------------------------------------------------------------------
-- UPDATE public.global_settings
-- SET promotional_banner_url = public._fix_mecanidoc_image_url(promotional_banner_url)
-- WHERE promotional_banner_url IS NOT NULL
--   AND promotional_banner_url ~* 'mecanidoc\.com';

-- Limpeza da função auxiliar (execute depois de validar tudo)
-- DROP FUNCTION IF EXISTS public._fix_mecanidoc_image_url(text);
