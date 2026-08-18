import { NextResponse } from 'next/server';
import { requireMasterUser } from '@/lib/admin-auth-server';
import { getStripe, resetStripeClient } from '@/lib/stripe-wrapper';
import { resolveStripeConfig } from '@/lib/stripe-credentials';

export async function POST() {
  const auth = await requireMasterUser();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  resetStripeClient();
  const config = await resolveStripeConfig();
  if (!config.secretKey) {
    return NextResponse.json(
      { ok: false, error: 'Stripe não configurado. Guarde a chave secreta (sk_test_ / sk_live_).' },
      { status: 400 }
    );
  }

  const stripe = await getStripe();
  if (!stripe) {
    return NextResponse.json(
      { ok: false, error: 'Pacote stripe indisponível. Execute npm install stripe.' },
      { status: 503 }
    );
  }

  try {
    const balance = await stripe.balance.retrieve();
    const livemode = Boolean(balance.livemode) || config.secretKey.startsWith('sk_live_');
    return NextResponse.json({
      ok: true,
      livemode,
      available: Array.isArray(balance.available)
        ? balance.available.map((b: { amount: number; currency: string }) => ({
            amount: b.amount,
            currency: b.currency,
          }))
        : [],
      hasPublishableKey: Boolean(config.publishableKey),
      webhookConfigured: Boolean(config.webhookSecret),
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Falha ao contactar o Stripe';
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
