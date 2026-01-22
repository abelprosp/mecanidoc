alter table public.profiles 
add column if not exists phone text,
add column if not exists address text,
add column if not exists city text,
add column if not exists zip_code text,
add column if not exists country text;
