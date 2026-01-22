create table if not exists public.footer_links (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  url text,
  slug text,
  content text,
  section text not null,
  sort_order integer default 0,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.footer_links enable row level security;

create policy "Footer links viewable by everyone" 
  on public.footer_links for select 
  using ( true );

create policy "Footer links managed by master" 
  on public.footer_links for all 
  using ( exists ( select 1 from public.profiles where id = auth.uid() and role = 'master' ) );

insert into public.footer_links (title, url, section, sort_order) values
('Assurance crevaison', '#', 'products', 10),
('Guide des pneus', '#', 'products', 20),
('Connexion entreprise', '/auth/login', 'products', 30),
('Enregistrement de l''entreprise', '/auth/register/entreprise', 'products', 40),
('Compte fournisseur', '/auth/login', 'products', 50),
('Besoin d''aide ?', '#', 'terms', 10),
('Garantie pneus', '#', 'terms', 20),
('Devenir garage partenaire', '/auth/register/garage', 'institutional', 10),
('Connexion au garage', '/auth/login', 'institutional', 20),
('Devenez affilié', '#', 'institutional', 30),
('Qui sommes-nous?', '#', 'institutional', 40);
