-- Carrousel d'offres sur l'accueil par catégorie parente (Auto, Moto, Camion, Tracteurs)
-- Si parent_category est NULL ou vide : la promo reste uniquement dans le bandeau (PromoBanner).

alter table public.promotions
  add column if not exists parent_category text,
  add column if not exists badge_text text,
  add column if not exists badge_color text;

comment on column public.promotions.parent_category is 'Auto | Moto | Camion | Tracteurs — carrousel accueil / catégorie ; vide = bandeau seul';
comment on column public.promotions.badge_text is 'Libellé du badge (ex. PROMO, OFFRE). Si vide : discount_text ou OFFRE.';
comment on column public.promotions.badge_color is 'red | green | blue | orange — couleur du badge';
