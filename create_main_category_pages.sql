-- Criar registros para as páginas principais do menu (Auto, Moto, Camion, Tracteurs)
-- Estas páginas já existem como rotas, mas precisam de configuração no banco

-- Página Auto (home)
INSERT INTO public.category_pages (slug, seo_title, seo_text, product_category_filter, created_at, updated_at)
VALUES (
  'auto',
  'Pneus Auto',
  'Découvrez notre large gamme de pneus auto. Que vous cherchiez la performance, la sécurité ou la durabilité, Mecanidoc vous propose les meilleures références du marché.',
  'Auto',
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO UPDATE SET
  product_category_filter = EXCLUDED.product_category_filter,
  updated_at = NOW();

-- Página Moto
INSERT INTO public.category_pages (slug, seo_title, seo_text, product_category_filter, created_at, updated_at)
VALUES (
  'moto',
  'Pneus Moto',
  'Découvrez notre large gamme de pneus moto. Que vous cherchiez la performance, la sécurité ou la durabilité, Mecanidoc vous propose les meilleures références du marché.',
  'Moto',
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO UPDATE SET
  product_category_filter = EXCLUDED.product_category_filter,
  updated_at = NOW();

-- Página Camion
INSERT INTO public.category_pages (slug, seo_title, seo_text, product_category_filter, created_at, updated_at)
VALUES (
  'camion',
  'Pneus Camion',
  'Découvrez notre large gamme de pneus camion. Que vous cherchiez la performance, la sécurité ou la durabilité, Mecanidoc vous propose les meilleures références du marché.',
  'Camion',
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO UPDATE SET
  product_category_filter = EXCLUDED.product_category_filter,
  updated_at = NOW();

-- Página Tracteurs
INSERT INTO public.category_pages (slug, seo_title, seo_text, product_category_filter, created_at, updated_at)
VALUES (
  'tracteurs',
  'Pneus Agricoles',
  'Découvrez notre large gamme de pneus agricoles. Que vous cherchiez la performance, la sécurité ou la durabilité, Mecanidoc vous propose les meilleures références du marché.',
  'Tracteurs',
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO UPDATE SET
  product_category_filter = EXCLUDED.product_category_filter,
  updated_at = NOW();
