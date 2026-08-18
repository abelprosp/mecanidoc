import { NextRequest, NextResponse } from 'next/server';
import { requireMasterUser } from '@/lib/admin-auth-server';
import {
  getStripeCredentialsStatus,
  saveStripeCredentials,
} from '@/lib/stripe-credentials';
import { resetStripeClient } from '@/lib/stripe-wrapper';

export async function GET() {
  const auth = await requireMasterUser();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const status = await getStripeCredentialsStatus();
    return NextResponse.json(status);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro ao ler credenciais Stripe';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireMasterUser();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json().catch(() => ({}));

  try {
    await saveStripeCredentials({
      secretKey: typeof body.secretKey === 'string' ? body.secretKey : undefined,
      publishableKey: typeof body.publishableKey === 'string' ? body.publishableKey : undefined,
      webhookSecret: typeof body.webhookSecret === 'string' ? body.webhookSecret : undefined,
      clearSecretKey: body.clearSecretKey === true,
      clearWebhookSecret: body.clearWebhookSecret === true,
    });
    resetStripeClient();
    const status = await getStripeCredentialsStatus();
    return NextResponse.json({ ok: true, ...status });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro ao guardar credenciais Stripe';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
