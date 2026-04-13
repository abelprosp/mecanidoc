-- Image de fond du hero (formulaire) pour chaque sous-catégorie du menu
alter table public.menu_subcategories
  add column if not exists hero_image_url text,
  add column if not exists hero_overlay text default 'medium';

comment on column public.menu_subcategories.hero_image_url is 'URL image de fond du hero (/categorie/[slug])';
comment on column public.menu_subcategories.hero_overlay is 'strong | medium | soft — intensité du voile sur la photo';
