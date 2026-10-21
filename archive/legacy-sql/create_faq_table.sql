-- Criar tabela de FAQs
create table if not exists public.faqs (
  id uuid default gen_random_uuid() primary key,
  page_slug text not null, -- 'home', 'moto', 'camion', 'tracteurs', ou slug de categoria
  question text not null,
  answer text not null,
  sort_order integer default 0,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Índices
create index if not exists idx_faqs_page_slug on public.faqs(page_slug, is_active);
create index if not exists idx_faqs_sort_order on public.faqs(page_slug, sort_order);

-- RLS
alter table public.faqs enable row level security;

-- Política: Todos podem ler FAQs ativos
create policy "Public read access" on public.faqs 
  for select 
  using (is_active = true);

-- Política: Apenas master pode gerenciar
create policy "Master write access" on public.faqs 
  for all 
  using (
    exists (
      select 1 from public.profiles 
      where id = auth.uid() and role = 'master'
    )
  );

-- Inserir FAQs padrão para a home
insert into public.faqs (page_slug, question, answer, sort_order, is_active) values
  ('home', 'Quelles sont les catégories de pneus disponibles ?', 'Les pneus se déclinent en plusieurs catégories : été, hiver, toutes saisons, runflat, et spécifiques pour 4x4, SUV, motos et utilitaires. Chaque type de pneu est conçu pour répondre à des conditions de conduite et des besoins spécifiques.', 10, true),
  ('home', 'Quelle est la réglementation sur les pneus ?', 'La réglementation impose des normes strictes concernant l''usure (profondeur minimale des sculptures de 1,6 mm), l''adéquation saisonnière (pneus hiver obligatoires dans certaines zones) et l''interdiction de monter des pneus de structures différentes sur un même essieu.', 20, true),
  ('home', 'Comment permuter les pneus ?', 'La permutation des pneus permet d''uniformiser l''usure. Pour les véhicules à traction avant, permutez les pneus avant vers l''arrière en croix. Pour les véhicules à propulsion arrière, permutez les pneus arrière vers l''avant en croix. Pour les 4x4, effectuez une permutation en X.', 30, true)
on conflict do nothing;
