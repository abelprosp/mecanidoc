-- Bucket para CSVs de importacao de produtos.
-- Upload: Supabase Dashboard > Storage (como admin do projeto) ou outro fluxo com service_role.
-- Import na app: POST /api/admin/import-products-storage (usa SUPABASE_SERVICE_ROLE_KEY).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-imports',
  'product-imports',
  false,
  15728640,
  array['text/csv', 'text/plain', 'application/csv', 'application/vnd.ms-excel']::text[]
)
on conflict (id) do nothing;
