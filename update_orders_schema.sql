alter table public.orders
add column if not exists contact_name text,
add column if not exists contact_phone text,
add column if not exists contact_email text,
add column if not exists shipping_address text,
add column if not exists shipping_city text,
add column if not exists shipping_zip text,
add column if not exists shipping_country text,
add column if not exists notes text;
