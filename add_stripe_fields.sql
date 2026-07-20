-- Adicionar campos do Stripe na tabela orders

ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT,
ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'stripe',
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending'; -- pending, paid, failed, refunded, canceled, partially_refunded

-- Adicionar índice para busca rápida por payment_intent_id
CREATE INDEX IF NOT EXISTS idx_orders_stripe_payment_intent ON public.orders(stripe_payment_intent_id);

-- Índice por checkout session
CREATE INDEX IF NOT EXISTS idx_orders_stripe_checkout_session ON public.orders(stripe_checkout_session_id);

-- Adicionar índice para busca por payment_status
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON public.orders(payment_status);

-- Idempotência de webhooks Stripe (event.id)
CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_processed_at
  ON public.stripe_webhook_events(processed_at);

-- Comentários
COMMENT ON COLUMN public.orders.stripe_payment_intent_id IS 'ID do PaymentIntent do Stripe';
COMMENT ON COLUMN public.orders.stripe_customer_id IS 'ID do Customer no Stripe';
COMMENT ON COLUMN public.orders.stripe_checkout_session_id IS 'ID da Checkout Session do Stripe';
COMMENT ON COLUMN public.orders.payment_method IS 'Método de pagamento usado';
COMMENT ON COLUMN public.orders.payment_status IS 'Status do pagamento: pending, paid, failed, refunded, canceled, partially_refunded';
COMMENT ON TABLE public.stripe_webhook_events IS 'Eventos Stripe já processados (idempotência de webhooks)';
