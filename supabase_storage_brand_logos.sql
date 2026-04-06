-- Execute no Supabase SQL Editor.
-- Upload: API /api/admin/brand-logo (SUPABASE_SERVICE_ROLE_KEY no servidor).
-- Leitura pública para logo_url no site.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'brand-logos',
  'brand-logos',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']::text[]
)
on conflict (id) do nothing;

drop policy if exists "brand_logos_public_read" on storage.objects;
create policy "brand_logos_public_read"
on storage.objects for select
using (bucket_id = 'brand-logos');
