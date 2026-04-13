-- Bucket public pour images de fond des heroes sous-catégories menu.
-- Ingestion : POST /api/admin/ingest-image-url avec kind: "subcategory".

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'subcategory-heroes',
  'subcategory-heroes',
  true,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']::text[]
)
on conflict (id) do nothing;

drop policy if exists "subcategory_heroes_public_read" on storage.objects;
create policy "subcategory_heroes_public_read"
on storage.objects for select
using (bucket_id = 'subcategory-heroes');
