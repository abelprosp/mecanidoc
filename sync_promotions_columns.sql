-- Colunas usadas pelo admin / carrousel / bandeau (PromotionsSection, HomeOffersCarousels, PromoBanner).
-- Executar no Supabase : SQL Editor → colar → Run.
-- Se o erro "schema cache" persistir 1–2 min, em Project Settings → API procure "Reload schema" / ou aguarde o cache do PostgREST atualizar.

alter table public.promotions add column if not exists parent_category text;
alter table public.promotions add column if not exists badge_text text;
alter table public.promotions add column if not exists badge_color text;
alter table public.promotions add column if not exists card_image_url text;
alter table public.promotions add column if not exists card_overlay text default 'medium';

comment on column public.promotions.parent_category is 'Auto | Moto | Camion | Tracteurs — carrousel ; vide = bandeau seul';
comment on column public.promotions.badge_text is 'Libellé du badge (ex. PROMO). Si vide : discount_text ou OFFRE.';
comment on column public.promotions.badge_color is 'red | green | blue | orange';
comment on column public.promotions.card_image_url is 'URL image de fond du carte (carrousel)';
comment on column public.promotions.card_overlay is 'strong | medium | soft — voile sombre sur la photo';
