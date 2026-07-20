import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/neumaticos-andres/server-helpers';
import {
  claimWebhookEvent,
  extractPaymentIntentId,
  markOrderPaid,
  toStripeAmountCents,
} from '@/lib/stripe-payments';
import { getStripe, isStripeConfigured } from '@/lib/stripe-wrapper';

type StripeEvent = {
  id: string;
  type: string;
  data: {
    object: any;
  };
};

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(request: NextRequest) {
  if (!isStripeConfigured() || !webhookSecret) {
    return NextResponse.json(
      {
        error:
          'Stripe webhook is not configured. Please set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET in environment variables.',
      },
      { status: 503 }
    );
  }

  const stripe = await getStripe();
  if (!stripe) {
    return NextResponse.json(
      { error: 'Stripe is not available. Please install the stripe package.' },
      { status: 503 }
    );
  }

  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  let event: StripeEvent;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret) as StripeEvent;
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  try {
    const supabase = getSupabaseAdmin();

    // Idempotência suave: markOrderPaid / fulfill já evitam side-effects duplicados.
    // claimWebhookEvent é feito no fim para que um 500 permita retry do Stripe.
    const already = await supabase
      .from('stripe_webhook_events')
      .select('id')
      .eq('id', event.id)
      .maybeSingle();

    if (already.data?.id) {
      return NextResponse.json({ received: true, duplicate: true });
    }
    // Se a tabela ainda não existir, already.error estará preenchido — ignoramos e seguimos

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as {
          id: string;
          payment_status?: string;
          payment_intent?: string | { id?: string };
          customer?: string | { id?: string };
          amount_total?: number | null;
          metadata?: { order_id?: string };
        };

        const orderId = session.metadata?.order_id;
        if (!orderId) {
          console.warn('checkout.session.completed without order_id metadata', session.id);
          break;
        }

        // Paiements asynchrones (ex. virement) : attendre checkout.session.async_payment_succeeded
        if (session.payment_status && session.payment_status !== 'paid') {
          console.log(
            `Checkout session ${session.id} completed with payment_status=${session.payment_status}; waiting for async confirmation`
          );
          break;
        }

        const { data: order } = await supabase
          .from('orders')
          .select('id, total_amount, payment_status')
          .eq('id', orderId)
          .maybeSingle();

        if (!order) {
          console.error('Order not found for checkout session:', orderId);
          break;
        }

        if (
          typeof session.amount_total === 'number' &&
          session.amount_total > 0 &&
          session.amount_total !== toStripeAmountCents(order.total_amount)
        ) {
          console.error(
            `Amount mismatch for order ${orderId}: stripe=${session.amount_total} db=${toStripeAmountCents(order.total_amount)}`
          );
          // Ne pas marquer paid automatiquement en cas d'écart
          break;
        }

        const paymentIntentId = extractPaymentIntentId(session.payment_intent);
        const customerId =
          typeof session.customer === 'string'
            ? session.customer
            : session.customer?.id || null;

        const result = await markOrderPaid(supabase, orderId, {
          paymentIntentId,
          checkoutSessionId: session.id,
          customerId,
        });

        if (!result.ok) {
          console.error('Failed to mark order paid:', result.error);
          return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
        }
        break;
      }

      case 'checkout.session.async_payment_succeeded': {
        const session = event.data.object as {
          id: string;
          payment_intent?: string | { id?: string };
          customer?: string | { id?: string };
          metadata?: { order_id?: string };
        };
        const orderId = session.metadata?.order_id;
        if (!orderId) break;

        const result = await markOrderPaid(supabase, orderId, {
          paymentIntentId: extractPaymentIntentId(session.payment_intent),
          checkoutSessionId: session.id,
          customerId:
            typeof session.customer === 'string'
              ? session.customer
              : session.customer?.id || null,
        });

        if (!result.ok) {
          console.error('Failed to mark order paid (async):', result.error);
          return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
        }
        break;
      }

      case 'checkout.session.async_payment_failed':
      case 'checkout.session.expired': {
        const session = event.data.object as {
          id: string;
          metadata?: { order_id?: string };
        };
        const orderId = session.metadata?.order_id;
        if (!orderId) break;

        const { data: order } = await supabase
          .from('orders')
          .select('id, payment_status')
          .eq('id', orderId)
          .maybeSingle();

        if (order && order.payment_status !== 'paid' && order.payment_status !== 'refunded') {
          await supabase
            .from('orders')
            .update({
              payment_status: event.type === 'checkout.session.expired' ? 'canceled' : 'failed',
            })
            .eq('id', orderId)
            .neq('payment_status', 'paid');
        }
        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as {
          id: string;
          customer?: string | { id?: string };
          metadata?: { order_id?: string };
        };
        const orderId = paymentIntent.metadata?.order_id;

        if (orderId) {
          const result = await markOrderPaid(supabase, orderId, {
            paymentIntentId: paymentIntent.id,
            customerId:
              typeof paymentIntent.customer === 'string'
                ? paymentIntent.customer
                : paymentIntent.customer?.id || null,
          });
          if (!result.ok) {
            console.error('Failed to mark order paid (PI):', result.error);
            return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
          }
        } else {
          // Fallback : retrouver la commande par payment_intent_id
          const { data: order } = await supabase
            .from('orders')
            .select('id')
            .eq('stripe_payment_intent_id', paymentIntent.id)
            .maybeSingle();

          if (order) {
            await markOrderPaid(supabase, order.id, {
              paymentIntentId: paymentIntent.id,
            });
          }
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as {
          id: string;
          metadata?: { order_id?: string };
        };
        const orderId = paymentIntent.metadata?.order_id;

        if (orderId) {
          await supabase
            .from('orders')
            .update({ payment_status: 'failed' })
            .eq('id', orderId)
            .neq('payment_status', 'paid');
        } else {
          await supabase
            .from('orders')
            .update({ payment_status: 'failed' })
            .eq('stripe_payment_intent_id', paymentIntent.id)
            .neq('payment_status', 'paid');
        }
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

    await claimWebhookEvent(supabase, event.id, event.type);

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Error processing webhook:', error);
    // 500 → Stripe retentera ; útil si la DB était temporairement indisponible
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
