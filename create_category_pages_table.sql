create table if not exists public.category_pages (
  id uuid default gen_random_uuid() primary key,
  slug text unique not null,
  hero_image text,
  promo_banners jsonb default '[]'::jsonb, -- Array of { title, subtitle, image, badge_text, badge_color }
  marketing_banner jsonb default '{}'::jsonb, -- { title, text, link }
  seo_title text,
  seo_text text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.category_pages enable row level security;

-- Policies
create policy "Public read access" on public.category_pages for select using (true);

create policy "Master write access" on public.category_pages for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'master')
);
