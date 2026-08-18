import { NextResponse } from 'next/server';
import { resolveStripeConfig } from '@/lib/stripe-credentials';

/** Chave pública Stripe — segura no browser. Lida em runtime (não depende do build Docker). */
export async function GET() {
  try {
    const config = await resolveStripeConfig();
    return NextResponse.json({
      configured: config.canCharge,
      publishableKey: config.publishableKey || null,
    });
  } catch (error) {
    console.error('Stripe config error:', error);
    return NextResponse.json({ configured: false, publishableKey: null });
  }
}
