import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/neumaticos-andres/server-helpers';
import {
  claimWebhookEvent,
  extractPaymentIntentId,
  markOrderPaid,
  releaseWebhookEvent,
  type MarkOrderPaidResult,
} from '@/lib/stripe-payments';
import { resolveStripeConfig } from '@/lib/stripe-credentials';
import { getStripe } from '@/lib/stripe-wrapper';

type StripeEvent = {
  id: string;
  type: string;
  data: {
    object: Record<string, unknown>;
  };
};

type SessionLike = {
  id: string;
  payment_status?: string;
  payment_intent?: string | { id?: string };
  customer?: string | { id?: string };
  amount_total?: number | null;
  currency?: string | null;
  metadata?: { order_id?: string };
};

type PaymentIntentLike = {
  id: string;
  amount?: number;
  amount_received?: number;
  currency?: string;
  customer?: string | { id?: string };
  metadata?: { order_id?: string };
};

function customerIdOf(customer: string | { id?: string } | undefined | null): string | null {
  if (!customer) return null;
  return typeof customer === 'string' ? customer : customer.id || null;
}

/** Erreur "définitive" (montant/devise) → 200 pour ne pas boucler ; erreur DB → 500 pour retry. */
function paidResultToResponse(result: MarkOrderPaidResult, context: string): NextResponse | null {
  if (result.ok) return null;
  if (result.code === 'AMOUNT_MISMATCH' || result.code === 'CURRENCY_MISMATCH' || result.code === 'NOT_FOUND') {
    console.error(`[stripe webhook] ${context}: ${result.error}`);
    return NextResponse.json({ received: true, ignored: true, reason: result.code });
  }
  console.error(`[stripe webhook] ${context}: ${result.error}`);
  return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
}

export async function POST(request: NextRequest) {
  const config = await resolveStripeConfig();
  const webhookSecret = config.webhookSecret;
  if (!config.secretKey || !webhookSecret) {
    return NextResponse.json(
      { error: 'Stripe webhook is not configured. Defina STRIPE_SECRET_KEY e STRIPE_WEBHOOK_SECRET, ou grave-os em Admin → Paiement Stripe.' },
      { status: 503 }
    );
  }

  const stripe = await getStripe();
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe is not available.' }, { status: 503 });
  }

  const body = await request.text();
  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  let event: StripeEvent;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret) as unknown as StripeEvent;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'invalid signature';
    console.error('Webhook signature verification failed:', message);
    return NextResponse.json({ error: `Webhook Error: ${message}` }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  // Déduplication atomique AVANT traitement : deux livraisons concurrentes du même
  // événement ne peuvent pas passer toutes les deux.
  const claim = await claimWebhookEvent(supabase, event.id, event.type);
  if (!claim.claimed) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded': {
        const session = event.data.object as unknown as SessionLike;
        const orderId = session.metadata?.order_id;
        if (!orderId) {
          console.warn(`${event.type} without order_id metadata`, session.id);
          break;
        }
        // Paiements asynchrones (virement) : attendre async_payment_succeeded
        if (event.type === 'checkout.session.completed' && session.payment_status && session.payment_status !== 'paid') {
          break;
        }

        const result = await markOrderPaid(supabase, orderId, {
          paymentIntentId: extractPaymentIntentId(session.payment_intent),
          checkoutSessionId: session.id,
          customerId: customerIdOf(session.customer),
          amountCents: typeof session.amount_total === 'number' ? session.amount_total : null,
          currency: session.currency || null,
        });
        const failure = paidResultToResponse(result, `${event.type} ${orderId}`);
        if (failure) {
          if (failure.status >= 500) await releaseWebhookEvent(event.id);
          return failure;
        }
        break;
      }

      case 'checkout.session.async_payment_failed':
      case 'checkout.session.expired': {
        const session = event.data.object as unknown as SessionLike;
        const orderId = session.metadata?.order_id;
        if (!orderId) break;
        await supabase
          .from('orders')
          .update({ payment_status: event.type === 'checkout.session.expired' ? 'canceled' : 'failed' })
          .eq('id', orderId)
          .neq('payment_status', 'paid')
          .neq('payment_status', 'refunded');
        break;
      }

      case 'payment_intent.succeeded': {
        const pi = event.data.object as unknown as PaymentIntentLike;
        const amountCents = typeof pi.amount_received === 'number' ? pi.amount_received : pi.amount ?? null;
        let orderId = pi.metadata?.order_id;

        if (!orderId) {
          const { data: order } = await supabase
            .from('orders')
            .select('id')
            .eq('stripe_payment_intent_id', pi.id)
            .maybeSingle();
          orderId = order?.id;
        }
        if (!orderId) break;

        const result = await markOrderPaid(supabase, orderId, {
          paymentIntentId: pi.id,
          customerId: customerIdOf(pi.customer),
          amountCents,
          currency: pi.currency || null,
        });
        const failure = paidResultToResponse(result, `payment_intent.succeeded ${orderId}`);
        if (failure) {
          if (failure.status >= 500) await releaseWebhookEvent(event.id);
          return failure;
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const pi = event.data.object as unknown as PaymentIntentLike;
        const orderId = pi.metadata?.order_id;
        const q = supabase.from('orders').update({ payment_status: 'failed' }).neq('payment_status', 'paid');
        if (orderId) await q.eq('id', orderId);
        else await q.eq('stripe_payment_intent_id', pi.id);
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object as {
          payment_intent?: string | { id?: string };
          amount_refunded?: number;
          amount?: number;
        };
        const paymentIntentId = extractPaymentIntentId(charge.payment_intent);
        if (!paymentIntentId) break;

        const fullyRefunded =
          typeof charge.amount === 'number' &&
          typeof charge.amount_refunded === 'number' &&
          charge.amount_refunded >= charge.amount;

        await supabase
          .from('orders')
          .update({
            payment_status: fullyRefunded ? 'refunded' : 'partially_refunded',
            ...(fullyRefunded ? { status: 'refunded' } : {}),
          })
          .eq('stripe_payment_intent_id', paymentIntentId);
        break;
      }

      default:
        console.log(`Unhandled Stripe event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    // Libérer la réclamation pour que Stripe puisse rejouer l'événement.
    await releaseWebhookEvent(event.id);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
