-- Tabela de promoções para o admin (publicidade / descontos no site)
CREATE TABLE IF NOT EXISTS public.promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  discount_text TEXT,
  description TEXT,
  link_url TEXT,
  is_active BOOLEAN DEFAULT true,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

-- Leitura pública (qualquer um pode ver promoções ativas)
CREATE POLICY "Promotions are viewable by everyone"
  ON public.promotions FOR SELECT
  USING (is_active = true AND (start_date IS NULL OR start_date <= now()) AND (end_date IS NULL OR end_date >= now()));

-- Utilizadores autenticados podem ver todas e gerir (admin)
CREATE POLICY "Authenticated users can read all promotions"
  ON public.promotions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert promotions"
  ON public.promotions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update promotions"
  ON public.promotions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete promotions"
  ON public.promotions FOR DELETE TO authenticated USING (true);

COMMENT ON TABLE public.promotions IS 'Promoções e publicidade exibidas no site (ex: 20% de desconto)';
