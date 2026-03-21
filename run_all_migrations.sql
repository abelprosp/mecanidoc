-- =============================================================================
-- MecaniDoc - Script SQL único (todas as migrações)
-- Execute no Supabase SQL Editor ou via psql. Ordem pensada para dependências.
--
-- Uso: ideal para banco novo (primeira instalação). Se o banco já tiver parte
-- do schema, execute apenas as secções que faltam ou rode os .sql individuais.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Schema base (tipos, perfis, configurações, garagens, fornecedores, empresas, produtos)
-- -----------------------------------------------------------------------------
create type user_role as enum ('master', 'garage', 'supplier', 'company', 'customer');

create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text,
  role user_role default 'customer',
  full_name text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.global_settings (
  id uuid default gen_random_uuid() primary key,
  platform_fee_percentage numeric default 5.0,
  default_tax_rate numeric default 20.0,
  delivery_base_fee numeric default 10.0,
  promotional_banner_url text,
  is_maintenance_mode boolean default false,
  updated_by uuid references public.profiles(id)
);

create table public.garages (
  id uuid default gen_random_uuid() primary key,
  profile_id uuid references public.profiles(id) not null,
  name text not null,
  address text not null,
  latitude numeric,
  longitude numeric,
  installation_price numeric not null,
  is_approved boolean default false,
  commission_balance numeric default 0.0,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

create table public.suppliers (
  id uuid default gen_random_uuid() primary key,
  profile_id uuid references public.profiles(id) not null,
  company_name text not null,
  vat_number text,
  is_approved boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

create table public.companies (
  id uuid default gen_random_uuid() primary key,
  profile_id uuid references public.profiles(id) not null,
  company_name text not null,
  discount_tier numeric default 5.0,
  vat_number text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

create table public.products (
  id uuid default gen_random_uuid() primary key,
  supplier_id uuid references public.suppliers(id),
  name text not null,
  description text,
  base_price numeric not null,
  stock_quantity integer default 0,
  category text,
  specs jsonb,
  images text[],
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', 'customer');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.global_settings enable row level security;
alter table public.products enable row level security;
alter table public.garages enable row level security;

create policy "Public profiles are viewable by everyone" on profiles for select using ( true );
create policy "Users can update own profile" on profiles for update using ( auth.uid() = id );
create policy "Settings viewable by everyone" on global_settings for select using ( true );
create policy "Settings editable by master only" on global_settings for all using (
  exists ( select 1 from profiles where id = auth.uid() and role = 'master' )
);
create policy "Products are viewable by everyone" on products for select using ( true );
create policy "Suppliers can manage own products" on products for all using (
  exists ( select 1 from suppliers where id = products.supplier_id and profile_id = auth.uid() and is_approved = true )
);
create policy "Master can manage all products" on products for all using (
  exists ( select 1 from profiles where id = auth.uid() and role = 'master' )
);

-- -----------------------------------------------------------------------------
-- 2. Pedidos e itens
-- -----------------------------------------------------------------------------
create table if not exists public.orders (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  total_amount numeric not null,
  status text default 'pending',
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.orders enable row level security;

create policy "Orders viewable by own user" on public.orders for select using (auth.uid() = user_id);
create policy "Orders viewable by master" on public.orders for select using (exists (select 1 from public.profiles where id = auth.uid() and role = 'master'));
create policy "Users can create orders" on public.orders for insert with check (auth.uid() = user_id);

create table if not exists public.order_items (
  id uuid default gen_random_uuid() primary key,
  order_id uuid references public.orders(id) not null,
  product_id uuid references public.products(id) not null,
  quantity integer not null default 1,
  price numeric not null,
  garage_id uuid references public.garages(id),
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.order_items enable row level security;

create policy "Order items viewable by owner" on public.order_items for select using (exists (select 1 from public.orders where id = order_items.order_id and user_id = auth.uid()));
create policy "Order items viewable by master" on public.order_items for select using (exists (select 1 from public.profiles where id = auth.uid() and role = 'master'));
create policy "Order items viewable by linked garage" on public.order_items for select using (exists (select 1 from public.garages where id = order_items.garage_id and profile_id = auth.uid()));
create policy "Users can insert order items" on public.order_items for insert with check (exists (select 1 from public.orders where id = order_items.order_id and user_id = auth.uid()));

-- Campos extras em orders
alter table public.orders add column if not exists contact_name text, add column if not exists contact_phone text, add column if not exists contact_email text, add column if not exists shipping_address text, add column if not exists shipping_city text, add column if not exists shipping_zip text, add column if not exists shipping_country text, add column if not exists notes text;

-- -----------------------------------------------------------------------------
-- 3. Stripe (orders)
-- -----------------------------------------------------------------------------
alter table public.orders
add column if not exists stripe_payment_intent_id text,
add column if not exists stripe_customer_id text,
add column if not exists payment_method text default 'stripe',
add column if not exists payment_status text default 'pending';

create index if not exists idx_orders_stripe_payment_intent on public.orders(stripe_payment_intent_id);
create index if not exists idx_orders_payment_status on public.orders(payment_status);

comment on column public.orders.stripe_payment_intent_id is 'ID do PaymentIntent do Stripe';
comment on column public.orders.stripe_customer_id is 'ID do Customer no Stripe';
comment on column public.orders.payment_method is 'Método de pagamento usado';
comment on column public.orders.payment_status is 'Status do pagamento: pending, paid, failed, refunded';

-- -----------------------------------------------------------------------------
-- 4. Marcas (brands)
-- -----------------------------------------------------------------------------
create table if not exists public.brands (
  id uuid default gen_random_uuid() primary key,
  name text not null unique,
  logo_url text,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.brands enable row level security;

drop policy if exists "Brands viewable by everyone" on public.brands;
create policy "Brands viewable by everyone" on public.brands for select using (true);
drop policy if exists "Brands editable by master only" on public.brands;
create policy "Brands editable by master only" on public.brands for all using (exists (select 1 from public.profiles where id = auth.uid() and role = 'master'));

-- -----------------------------------------------------------------------------
-- 5. Produtos (campos extras)
-- -----------------------------------------------------------------------------
alter table public.products
add column if not exists sale_price numeric,
add column if not exists brand text,
add column if not exists ean text,
add column if not exists shipping_cost numeric default 0,
add column if not exists supplier_user_id uuid references auth.users(id),
add column if not exists labels jsonb;

drop policy if exists "Users can insert own products" on public.products;
create policy "Users can insert own products" on public.products for insert with check ( auth.uid() = supplier_user_id );
drop policy if exists "Users can update own products" on public.products;
create policy "Users can update own products" on public.products for update using ( auth.uid() = supplier_user_id );

comment on column public.products.specs is 'Stores JSON: {width, height, diameter, load, speed, season, runflat, etc}';

alter table public.products add column if not exists brand_id uuid references public.brands(id);
alter table public.products add column if not exists pa_tipo text;
comment on column public.products.pa_tipo is 'Tipo de produto do CSV (usado para criar subcategorias do menu e filtrar produtos)';
create index if not exists idx_products_pa_tipo on public.products(pa_tipo) where pa_tipo is not null;

-- -----------------------------------------------------------------------------
-- 6. Garagens (campos extras)
-- -----------------------------------------------------------------------------
alter table public.garages
add column if not exists phone_primary text,
add column if not exists phone_secondary text,
add column if not exists siret text,
add column if not exists legal_form text,
add column if not exists company_name text,
add column if not exists tire_types jsonb,
add column if not exists opening_hours text,
add column if not exists country text,
add column if not exists zip_code text,
add column if not exists city text,
add column if not exists street_number text,
add column if not exists address_complement text;

drop policy if exists "Garages can insert own data" on public.garages;
create policy "Garages can insert own data" on public.garages for insert with check ( auth.uid() = profile_id );

-- -----------------------------------------------------------------------------
-- 7. Perfis (campos extras)
-- -----------------------------------------------------------------------------
alter table public.profiles
add column if not exists phone text,
add column if not exists address text,
add column if not exists city text,
add column if not exists zip_code text,
add column if not exists country text;

-- -----------------------------------------------------------------------------
-- 8. Taxas (taxes)
-- -----------------------------------------------------------------------------
create table if not exists public.taxes (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  rate numeric not null,
  is_percentage boolean default true,
  is_active boolean default true,
  applies_to text default 'all',
  sort_order integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

create index if not exists idx_taxes_active on public.taxes(is_active, sort_order);
alter table public.taxes enable row level security;

drop policy if exists "Public read access" on public.taxes;
create policy "Public read access" on public.taxes for select using (is_active = true);
drop policy if exists "Master write access" on public.taxes;
create policy "Master write access" on public.taxes for all using (exists (select 1 from public.profiles where id = auth.uid() and role = 'master'));

insert into public.taxes (name, description, rate, is_percentage, is_active, sort_order)
select 'TVA', 'Taxe sur la valeur ajoutée', 20.0, true, true, 10 where not exists (select 1 from public.taxes where name = 'TVA')
union all
select 'Taxe Platforme', 'Commission de la plateforme', 5.0, true, true, 20 where not exists (select 1 from public.taxes where name = 'Taxe Platforme');

-- -----------------------------------------------------------------------------
-- 9. FAQs
-- -----------------------------------------------------------------------------
create table if not exists public.faqs (
  id uuid default gen_random_uuid() primary key,
  page_slug text not null,
  question text not null,
  answer text not null,
  sort_order integer default 0,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

create index if not exists idx_faqs_page_slug on public.faqs(page_slug, is_active);
create index if not exists idx_faqs_sort_order on public.faqs(page_slug, sort_order);
alter table public.faqs enable row level security;

drop policy if exists "Public read access" on public.faqs;
create policy "Public read access" on public.faqs for select using (is_active = true);
drop policy if exists "Master write access" on public.faqs;
create policy "Master write access" on public.faqs for all using (exists (select 1 from public.profiles where id = auth.uid() and role = 'master'));

insert into public.faqs (page_slug, question, answer, sort_order, is_active) values
  ('home', 'Quelles sont les catégories de pneus disponibles ?', 'Les pneus se déclinent en plusieurs catégories : été, hiver, toutes saisons, runflat, et spécifiques pour 4x4, SUV, motos et utilitaires. Chaque type de pneu est conçu pour répondre à des conditions de conduite et des besoins spécifiques.', 10, true),
  ('home', 'Quelle est la réglementation sur les pneus ?', 'La réglementation impose des normes strictes concernant l''usure (profondeur minimale des sculptures de 1,6 mm), l''adéquation saisonnière (pneus hiver obligatoires dans certaines zones) et l''interdiction de monter des pneus de structures différentes sur un même essieu.', 20, true),
  ('home', 'Comment permuter les pneus ?', 'La permutation des pneus permet d''uniformiser l''usure. Pour les véhicules à traction avant, permutez les pneus avant vers l''arrière en croix. Pour les véhicules à propulsion arrière, permutez les pneus arrière vers l''avant en croix. Pour les 4x4, effectuez une permutation en X.', 30, true);

-- -----------------------------------------------------------------------------
-- 10. Footer links
-- -----------------------------------------------------------------------------
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

alter table public.footer_links add column if not exists updated_at timestamptz default now();
create unique index if not exists idx_footer_links_slug_unique on public.footer_links(slug) where slug is not null;

alter table public.footer_links enable row level security;

drop policy if exists "Footer links viewable by everyone" on public.footer_links;
create policy "Footer links viewable by everyone" on public.footer_links for select using ( true );
drop policy if exists "Footer links managed by master" on public.footer_links;
create policy "Footer links managed by master" on public.footer_links for all using ( exists ( select 1 from public.profiles where id = auth.uid() and role = 'master' ) );

insert into public.footer_links (title, url, section, sort_order)
select * from (values
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
  ('Qui sommes-nous?', '#', 'institutional', 40)
) v(title, url, section, sort_order)
where not exists (select 1 from public.footer_links limit 1);

-- Atualizar slugs e conteúdo dos footer links (add_footer_links_and_content)
update public.footer_links
set slug = lower(regexp_replace(regexp_replace(title, '[^a-zA-Z0-9\s]', '', 'g'), '\s+', '-', 'g'))
where slug is null or slug = '';

-- Inserir links legais (usar INSERT com ON CONFLICT apenas onde slug já existir - evitar duplicatas por slug)
insert into public.footer_links (title, slug, section, sort_order, content, is_active)
select 'Conditions générales de vente', 'cgv', 'legal', 10,
'<h1>Conditions générales de vente</h1><p>Les présentes conditions générales de vente régissent les relations entre MecaniDoc.com et ses clients.</p><h2>1. Objet</h2><p>Les présentes conditions générales de vente ont pour objet de définir les modalités et conditions de vente des produits proposés par MecaniDoc.com.</p><h2>2. Prix</h2><p>Les prix de nos produits sont indiqués en euros, toutes taxes comprises (TTC).</p><h2>3. Commande</h2><p>La commande est validée après confirmation par email.</p><h2>4. Livraison</h2><p>Les délais de livraison sont indiqués lors de la commande.</p><h2>5. Retour</h2><p>Conformément à la législation en vigueur, vous disposez d''un délai de 14 jours pour retourner un produit non conforme.</p>', true
where not exists (select 1 from public.footer_links where slug = 'cgv');

insert into public.footer_links (title, slug, section, sort_order, content, is_active)
select 'Mentions légales', 'mentions-legales', 'legal', 20, '<h1>Mentions légales</h1><h2>1. Éditeur du site</h2><p><strong>MecaniDoc.com</strong></p><p>Société spécialisée dans la vente de pneus en ligne.</p><h2>2. Directeur de publication</h2><p>Le directeur de publication est le représentant légal de MecaniDoc.com.</p><h2>3. Hébergement</h2><p>Le site est hébergé par [Nom de l''hébergeur].</p><h2>4. Propriété intellectuelle</h2><p>Tous les éléments du site MecaniDoc.com sont protégés par le droit d''auteur.</p><h2>5. Données personnelles</h2><p>Conformément à la loi Informatique et Libertés, vous disposez d''un droit d''accès, de rectification et de suppression des données vous concernant.</p>', true
where not exists (select 1 from public.footer_links where slug = 'mentions-legales');

insert into public.footer_links (title, slug, section, sort_order, content, is_active)
select 'Politique de gestion des données personnelles', 'politique-donnees-personnelles', 'legal', 30, '<h1>Politique de gestion des données personnelles</h1><h2>1. Collecte des données</h2><p>MecaniDoc.com collecte les données personnelles nécessaires à la gestion de votre commande et à l''amélioration de nos services.</p><h2>2. Utilisation des données</h2><p>Vos données personnelles sont utilisées pour :</p><ul><li>Le traitement de vos commandes</li><li>La gestion de votre compte client</li><li>L''envoi d''informations commerciales (avec votre consentement)</li></ul><h2>3. Conservation des données</h2><p>Vos données sont conservées pendant la durée nécessaire aux finalités pour lesquelles elles ont été collectées.</p><h2>4. Vos droits</h2><p>Conformément au RGPD, vous disposez d''un droit d''accès, de rectification, de suppression et d''opposition concernant vos données personnelles.</p><h2>5. Contact</h2><p>Pour exercer vos droits, contactez-nous à l''adresse : [email]</p>', true
where not exists (select 1 from public.footer_links where slug = 'politique-donnees-personnelles');

insert into public.footer_links (title, slug, section, sort_order, content, is_active)
select 'Paramétrez les cookies', 'parametrez-les-cookies', 'legal', 40, '<h1>Paramétrez les cookies</h1><h2>1. Qu''est-ce qu''un cookie ?</h2><p>Un cookie est un petit fichier texte déposé sur votre terminal lors de la visite d''un site.</p><h2>2. Types de cookies utilisés</h2><p>MecaniDoc.com utilise différents types de cookies :</p><ul><li><strong>Cookies techniques</strong> : nécessaires au fonctionnement du site</li><li><strong>Cookies analytiques</strong> : pour analyser l''utilisation du site</li><li><strong>Cookies publicitaires</strong> : pour personnaliser les publicités</li></ul><h2>3. Gestion des cookies</h2><p>Vous pouvez accepter ou refuser les cookies via les paramètres de votre navigateur.</p><h2>4. Cookies tiers</h2><p>Certains cookies sont déposés par des services tiers (Google Analytics, etc.).</p>', true
where not exists (select 1 from public.footer_links where slug = 'parametrez-les-cookies');

update public.footer_links set content = '<h1>' || title || '</h1><p>Cette page est en cours de rédaction. Le contenu sera bientôt disponible.</p><p>MecaniDoc.com s''engage à vous fournir des informations complètes et à jour.</p>' where (content is null or content = '') and slug is not null and slug != '';

update public.footer_links set slug = 'assurance-crevaison', content = '<h1>Assurance crevaison</h1><p>Protégez-vous contre les imprévus de la route avec notre assurance crevaison.</p><h2>Avantages</h2><ul><li>Remplacement rapide en cas de crevaison</li><li>Assistance 24/7</li><li>Couverture étendue</li></ul>' where title = 'Assurance crevaison' and (slug is null or slug = '');
update public.footer_links set slug = 'guide-des-pneus', content = '<h1>Guide des pneus</h1><p>Découvrez notre guide complet pour choisir les pneus adaptés à votre véhicule.</p><h2>Conseils d''achat</h2><ul><li>Comment choisir la bonne dimension</li><li>Comprendre les indices de charge et de vitesse</li><li>Pneus été vs hiver vs 4 saisons</li></ul>' where title = 'Guide des pneus' and (slug is null or slug = '');
update public.footer_links set slug = 'besoin-d-aide', content = '<h1>Besoin d''aide ?</h1><p>Notre équipe est à votre disposition pour répondre à toutes vos questions.</p><h2>Contactez-nous</h2><p>Email : support@mecanidoc.com</p><p>Téléphone : [Numéro]</p><p>Horaires : Du lundi au vendredi, 9h-18h</p>' where title = 'Besoin d''aide ?' and (slug is null or slug = '');
update public.footer_links set slug = 'garantie-pneus', content = '<h1>Garantie pneus</h1><p>MecaniDoc.com vous garantit la qualité de tous ses produits.</p><h2>Garantie constructeur</h2><p>Tous nos pneus bénéficient de la garantie du constructeur.</p><h2>Garantie MecaniDoc</h2><p>En cas de problème, nous remplaçons ou remboursons votre pneu.</p>' where title = 'Garantie pneus' and (slug is null or slug = '');
update public.footer_links set slug = 'devenez-affilie', content = '<h1>Devenez affilié</h1><p>Rejoignez notre programme d''affiliation et gagnez des commissions.</p><h2>Avantages</h2><ul><li>Commissions attractives</li><li>Outils de suivi performants</li><li>Support dédié</li></ul><h2>Comment s''inscrire ?</h2><p>Contactez-nous à l''adresse : affiliation@mecanidoc.com</p>' where title = 'Devenez affilié' and (slug is null or slug = '');
update public.footer_links set slug = 'qui-sommes-nous', content = '<h1>Qui sommes-nous ?</h1><p>MecaniDoc.com est votre spécialiste en pneus en ligne.</p><h2>Notre mission</h2><p>Vous offrir les meilleurs pneus au meilleur prix, avec un service client irréprochable.</p><h2>Nos valeurs</h2><ul><li>Qualité</li><li>Fiabilité</li><li>Service client</li></ul>' where title = 'Qui sommes-nous?' and (slug is null or slug = '');

-- Página Modes de livraison (insert se não existir)
insert into public.footer_links (title, slug, section, sort_order, content, is_active)
select 'Conditions de Livraison', 'modes-de-livraison', 'products', 15,
'<div class="container mx-auto px-4 py-8"><div class="max-w-4xl mx-auto"><h1 class="text-3xl md:text-4xl font-bold text-gray-900 mb-6 uppercase tracking-tight">Conditions de Livraison</h1><p class="text-gray-700 text-base md:text-lg mb-8 leading-relaxed">Nous proposons plusieurs options de livraison afin de répondre au mieux à vos besoins :</p><div class="space-y-8 mb-12"><div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:p-8"><div class="flex items-start gap-4 mb-4"><span class="text-3xl flex-shrink-0">🚛</span><div class="flex-1"><h2 class="text-2xl md:text-3xl font-bold text-gray-900 mb-2 uppercase">Livraison STANDARD – GRATUITE</h2><p class="text-gray-700 text-base md:text-lg leading-relaxed">La livraison standard est gratuite pour toute commande de <strong class="text-gray-900 font-bold">2 pneus ou plus</strong>.<br/>Les pneus sont livrés à domicile ou à l''adresse indiquée lors de la commande, sans frais supplémentaires.</p></div></div></div><div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:p-8"><div class="flex items-start gap-4 mb-4"><span class="text-3xl flex-shrink-0">⚡</span><div class="flex-1"><h2 class="text-2xl md:text-3xl font-bold text-gray-900 mb-2 uppercase">Livraison EXPRESS</h2><p class="text-gray-700 text-base md:text-lg leading-relaxed">Les commandes en livraison express sont traitées en priorité.<br/>Cette option garantit une expédition accélérée pour une réception rapide.</p></div></div></div><div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:p-8"><div class="flex items-start gap-4 mb-4"><span class="text-3xl flex-shrink-0">📍</span><div class="flex-1"><h2 class="text-2xl md:text-3xl font-bold text-gray-900 mb-2 uppercase">Livraison en POINT DE RETRAIT</h2><p class="text-gray-700 text-base md:text-lg leading-relaxed mb-4">Vous avez la possibilité de faire livrer vos pneus dans un garage partenaire ou un point de retrait de votre choix.</p><p class="text-gray-700 text-sm md:text-base leading-relaxed bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded"><strong class="font-bold text-gray-900">Important :</strong> Il est de votre responsabilité de contacter le garage partenaire ou le point de retrait afin de l''informer de la réception de votre commande et d''organiser l''installation si nécessaire.</p></div></div></div></div><div class="bg-gray-50 rounded-xl p-6 md:p-8 border border-gray-200"><h2 class="text-2xl md:text-3xl font-bold text-gray-900 mb-6">Dispositions générales</h2><ul class="space-y-4 text-gray-700 text-base md:text-lg leading-relaxed"><li class="flex items-start gap-3"><span class="text-blue-600 font-bold mt-1 flex-shrink-0">•</span><span>Les délais de livraison sont donnés à titre indicatif et peuvent varier en fonction de la disponibilité des produits et des contraintes logistiques.</span></li><li class="flex items-start gap-3"><span class="text-blue-600 font-bold mt-1 flex-shrink-0">•</span><span>En cas d''absence lors de la livraison à domicile, un avis de passage pourra être laissé par le transporteur avec les instructions pour reprogrammer la livraison ou récupérer le colis.</span></li><li class="flex items-start gap-3"><span class="text-blue-600 font-bold mt-1 flex-shrink-0">•</span><span>Nous nous engageons à assurer un service de livraison rapide et efficace afin de garantir votre satisfaction.</span></li></ul></div></div></div>', true
where not exists (select 1 from public.footer_links where slug = 'modes-de-livraison');

-- Atualizar conteúdo da página Modes de Livraison (se já existir)
update public.footer_links set content = '<div class="container mx-auto px-4 py-8"><h1 class="text-3xl md:text-4xl font-bold text-gray-900 mb-6 uppercase tracking-tight">Modes de Livraison</h1><p class="text-gray-700 text-base md:text-lg mb-8 leading-relaxed">Nous proposons plusieurs options de livraison afin de répondre au mieux à vos besoins :</p><div class="space-y-8 mb-12"><div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:p-8"><div class="flex items-start gap-4 mb-4"><span class="text-3xl">🚛</span><div class="flex-1"><h2 class="text-2xl md:text-3xl font-bold text-gray-900 mb-2 uppercase">Livraison STANDARD – GRATUITE</h2><p class="text-gray-700 text-base md:text-lg leading-relaxed">La livraison standard est gratuite pour toute commande de 2 pneus ou plus.<br/>Les pneus sont livrés à domicile ou à l''adresse indiquée lors de la commande, sans frais supplémentaires.</p></div></div></div><div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:p-8"><div class="flex items-start gap-4 mb-4"><span class="text-3xl">⚡</span><div class="flex-1"><h2 class="text-2xl md:text-3xl font-bold text-gray-900 mb-2 uppercase">Livraison EXPRESS</h2><p class="text-gray-700 text-base md:text-lg leading-relaxed">Les commandes en livraison express sont traitées en priorité.<br/>Cette option garantit une expédition accélérée pour une réception rapide.</p></div></div></div><div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:p-8"><div class="flex items-start gap-4 mb-4"><span class="text-3xl">📍</span><div class="flex-1"><h2 class="text-2xl md:text-3xl font-bold text-gray-900 mb-2 uppercase">Livraison en POINT DE RETRAIT</h2><p class="text-gray-700 text-base md:text-lg leading-relaxed mb-4">Vous avez la possibilité de faire livrer vos pneus dans un garage partenaire ou un point de retrait de votre choix.</p><p class="text-gray-700 text-sm md:text-base leading-relaxed bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded"><strong class="font-bold text-gray-900">Important :</strong> Il est de votre responsabilité de contacter le garage partenaire ou le point de retrait afin de l''informer de la réception de votre commande et d''organiser l''installation si nécessaire.</p></div></div></div></div><div class="bg-gray-50 rounded-xl p-6 md:p-8 border border-gray-200"><h2 class="text-2xl md:text-3xl font-bold text-gray-900 mb-6">Dispositions générales</h2><ul class="space-y-4 text-gray-700 text-base md:text-lg leading-relaxed"><li class="flex items-start gap-3"><span class="text-blue-600 font-bold mt-1">•</span><span>Les délais de livraison sont donnés à titre indicatif et peuvent varier en fonction de la disponibilité des produits et des contraintes logistiques.</span></li><li class="flex items-start gap-3"><span class="text-blue-600 font-bold mt-1">•</span><span>En cas d''absence lors de la livraison à domicile, un avis de passage pourra être laissé par le transporteur avec les instructions pour reprogrammer la livraison ou récupérer le colis.</span></li><li class="flex items-start gap-3"><span class="text-blue-600 font-bold mt-1">•</span><span>Nous nous engageons à assurer un service de livraison rapide et efficace afin de garantir votre satisfaction.</span></li></ul></div></div>', updated_at = now() where slug = 'modes-de-livraison';

-- -----------------------------------------------------------------------------
-- 11. Menu subcategorias e category_pages
-- -----------------------------------------------------------------------------
create table if not exists public.menu_subcategories (
  id uuid default gen_random_uuid() primary key,
  parent_category text not null,
  name text not null,
  slug text not null,
  icon_name text,
  sort_order integer default 0,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now()),
  unique(parent_category, slug)
);

create index if not exists idx_menu_subcategories_parent on public.menu_subcategories(parent_category, is_active);
alter table public.menu_subcategories enable row level security;

drop policy if exists "Public read access" on public.menu_subcategories;
create policy "Public read access" on public.menu_subcategories for select using (is_active = true);
drop policy if exists "Master write access" on public.menu_subcategories;
create policy "Master write access" on public.menu_subcategories for all using (exists (select 1 from public.profiles where id = auth.uid() and role = 'master'));

create or replace function generate_slug(text) returns text as $$
  select lower(regexp_replace(regexp_replace($1, '[^a-zA-Z0-9\s]', '', 'g'), '\s+', '-', 'g'));
$$ language sql immutable;

alter table public.menu_subcategories add column if not exists product_category_filter text;
update public.menu_subcategories set product_category_filter = case when parent_category = 'Auto' then 'Auto' when parent_category = 'Moto' then 'Moto' when parent_category = 'Camion' then 'Camion' when parent_category = 'Tracteur' then 'Tracteurs' else 'Auto' end where product_category_filter is null;
comment on column public.menu_subcategories.product_category_filter is 'Categoria de produto a filtrar nesta subcategoria (Auto, Moto, Camion, Tracteurs)';

create table if not exists public.category_pages (
  id uuid default gen_random_uuid() primary key,
  slug text unique not null,
  hero_image text,
  promo_banners jsonb default '[]'::jsonb,
  marketing_banner jsonb default '{}'::jsonb,
  seo_title text,
  seo_text text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.category_pages add column if not exists updated_at timestamptz default now();
alter table public.category_pages add column if not exists product_category_filter text default 'auto';

alter table public.category_pages enable row level security;

drop policy if exists "Public read access" on public.category_pages;
create policy "Public read access" on public.category_pages for select using (true);
drop policy if exists "Master write access" on public.category_pages;
create policy "Master write access" on public.category_pages for all using (exists (select 1 from public.profiles where id = auth.uid() and role = 'master'));

insert into public.category_pages (slug, seo_title, seo_text, product_category_filter, created_at, updated_at) values
  ('auto', 'Pneus Auto', 'Découvrez notre large gamme de pneus auto. Que vous cherchiez la performance, la sécurité ou la durabilité, Mecanidoc vous propose les meilleures références du marché.', 'Auto', now(), now()),
  ('moto', 'Pneus Moto', 'Découvrez notre large gamme de pneus moto. Que vous cherchiez la performance, la sécurité ou la durabilité, Mecanidoc vous propose les meilleures références du marché.', 'Moto', now(), now()),
  ('camion', 'Pneus Camion', 'Découvrez notre large gamme de pneus camion. Que vous cherchiez la performance, la sécurité ou la durabilité, Mecanidoc vous propose les meilleures références du marché.', 'Camion', now(), now()),
  ('tracteurs', 'Pneus Agricoles', 'Découvrez notre large gamme de pneus agricoles. Que vous cherchiez la performance, la sécurité ou la durabilité, Mecanidoc vous propose les meilleures références du marché.', 'Tracteurs', now(), now())
on conflict (slug) do update set product_category_filter = excluded.product_category_filter, updated_at = now();

-- -----------------------------------------------------------------------------
-- 12. Promoções
-- -----------------------------------------------------------------------------
create table if not exists public.promotions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  discount_text text,
  description text,
  link_url text,
  is_active boolean default true,
  start_date timestamptz,
  end_date timestamptz,
  sort_order int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.promotions enable row level security;

drop policy if exists "Promotions are viewable by everyone" on public.promotions;
create policy "Promotions are viewable by everyone" on public.promotions for select using (is_active = true and (start_date is null or start_date <= now()) and (end_date is null or end_date >= now()));
drop policy if exists "Authenticated users can read all promotions" on public.promotions;
create policy "Authenticated users can read all promotions" on public.promotions for select to authenticated using (true);
drop policy if exists "Authenticated users can insert promotions" on public.promotions;
create policy "Authenticated users can insert promotions" on public.promotions for insert to authenticated with check (true);
drop policy if exists "Authenticated users can update promotions" on public.promotions;
create policy "Authenticated users can update promotions" on public.promotions for update to authenticated using (true) with check (true);
drop policy if exists "Authenticated users can delete promotions" on public.promotions;
create policy "Authenticated users can delete promotions" on public.promotions for delete to authenticated using (true);

comment on table public.promotions is 'Promoções e publicidade exibidas no site (ex: 20% de desconto)';

-- -----------------------------------------------------------------------------
-- 13. Vincular produtos existentes a marcas (brand_id)
-- -----------------------------------------------------------------------------
update public.products p set brand_id = (select b.id from public.brands b where lower(trim(b.name)) = lower(trim(p.brand)) limit 1)
where p.brand_id is null and p.brand is not null and p.brand != '';

-- -----------------------------------------------------------------------------
-- 14. Master user (requer extensão pgcrypto; em Supabase Cloud auth.users pode ter restrições)
-- -----------------------------------------------------------------------------
create extension if not exists pgcrypto;

DO $$
DECLARE
  new_user_id uuid := gen_random_uuid();
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'redobrai@gmail.com') THEN
    INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
    VALUES ('00000000-0000-0000-0000-000000000000', new_user_id, 'authenticated', 'authenticated', 'redobrai@gmail.com', crypt('Amocarro487@', gen_salt('bf')), now(), '{"provider": "email", "providers": ["email"]}', '{"full_name": "Master Admin"}', now(), now(), '', '', '', '');
    UPDATE public.profiles SET role = 'master' WHERE id = new_user_id;
  ELSE
    UPDATE public.profiles SET role = 'master' WHERE email = 'redobrai@gmail.com';
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 15. Messagerie support admin (SMTP / IMAP) — table + RLS master uniquement
-- -----------------------------------------------------------------------------
create table if not exists public.support_mail_settings (
  id uuid primary key default gen_random_uuid(),
  smtp_host text,
  smtp_port integer default 587,
  smtp_user text,
  smtp_pass text,
  smtp_from text,
  imap_host text,
  imap_port integer default 993,
  imap_user text,
  imap_pass text,
  imap_mailbox text default 'INBOX',
  updated_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.support_mail_settings enable row level security;

drop policy if exists "Master full access support_mail_settings" on public.support_mail_settings;
create policy "Master full access support_mail_settings"
  on public.support_mail_settings
  for all
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'master')
  )
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'master')
  );

-- -----------------------------------------------------------------------------
-- 16. Garagens: RLS para busca pública (aprovadas) + dono + master
-- -----------------------------------------------------------------------------
drop policy if exists "Garages approved public read or owner read" on public.garages;
create policy "Garages approved public read or owner read"
  on public.garages
  for select
  using (
    coalesce(is_approved, false) = true
    or profile_id = auth.uid()
  );

drop policy if exists "Master can update any garage" on public.garages;
create policy "Master can update any garage"
  on public.garages
  for update
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'master')
  );

drop policy if exists "Garage owner can update own" on public.garages;
create policy "Garage owner can update own"
  on public.garages
  for update
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

drop policy if exists "Master can delete garages" on public.garages;
create policy "Master can delete garages"
  on public.garages
  for delete
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'master')
  );

-- -----------------------------------------------------------------------------
-- Comptes clients → file fournisseur (Approbations admin)
-- -----------------------------------------------------------------------------
alter table public.profiles
  add column if not exists supplier_promotion_pending boolean not null default false;

comment on column public.profiles.supplier_promotion_pending is
  'Inscription client : en attente pour promotion fournisseur par le master.';

drop policy if exists "Master can update any profile" on public.profiles;
create policy "Master can update any profile" on public.profiles
  for update
  using (
    exists (
      select 1 from public.profiles pr
      where pr.id = auth.uid() and pr.role = 'master'
    )
  );

-- =============================================================================
-- Fim do script único
-- =============================================================================
