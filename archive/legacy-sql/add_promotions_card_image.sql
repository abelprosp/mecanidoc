-- Image de fond des cartes du carrousel d'offres + intensité du voile sombre
alter table public.promotions
  add column if not exists card_image_url text,
  add column if not exists card_overlay text default 'medium';

comment on column public.promotions.card_image_url is 'URL image de fond du carte (carrousel)';
comment on column public.promotions.card_overlay is 'strong | medium | soft — opacité du dégradé noir par-dessus la photo';
