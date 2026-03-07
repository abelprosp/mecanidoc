import { NextRequest, NextResponse } from 'next/server';
import { getStripe, isStripeConfigured } from '@/lib/stripe-wrapper';
import { createClient } from '@supabase/supabase-js';

// Tipo Stripe opcional
type StripeEvent = {
  type: string;
  data: {
    object: any;
  };
};

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for webhook.');
  }
  return createClient(supabaseUrl, supabaseServiceKey);
}

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(request: NextRequest) {
  if (!isStripeConfigured() || !webhookSecret) {
    return NextResponse.json(
      { error: 'Stripe webhook is not configured. Please set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET in environment variables.' },
      { status: 503 }
    );
  }

  // Inicializar Stripe dinamicamente
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
    return NextResponse.json(
      { error: 'No signature' },
      { status: 400 }
    );
  }

  let event: StripeEvent;

  try {
    // stripe já foi verificado acima, então não é null aqui
    event = stripe!.webhooks.constructEvent(body, signature, webhookSecret) as StripeEvent;
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 }
    );
  }

  try {
    const supabase = getSupabaseAdmin();

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as { id: string; payment_intent?: string; metadata?: { order_id?: string } };
        const orderId = session.metadata?.order_id;

        if (orderId) {
          const updatePayload: Record<string, unknown> = {
            payment_status: 'paid',
            status: 'paid',
          };
          if (session.payment_intent) {
            updatePayload.stripe_payment_intent_id = session.payment_intent;
          }
          await supabase
            .from('orders')
            .update(updatePayload)
            .eq('id', orderId);
        }
        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as { id: string; metadata: { order_id?: string } };
        const orderId = paymentIntent.metadata.order_id;

        if (orderId) {
          await supabase
            .from('orders')
            .update({
              payment_status: 'paid',
              status: 'paid',
            })
            .eq('stripe_payment_intent_id', paymentIntent.id);
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as { id: string; metadata: { order_id?: string } };
        const orderId = paymentIntent.metadata.order_id;

        if (orderId) {
          await supabase
            .from('orders')
            .update({
              payment_status: 'failed',
            })
            .eq('stripe_payment_intent_id', paymentIntent.id);
        }
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object as { payment_intent?: string };
        const paymentIntentId = charge.payment_intent as string;

        if (paymentIntentId) {
          await supabase
            .from('orders')
            .update({
              payment_status: 'refunded',
            })
            .eq('stripe_payment_intent_id', paymentIntentId);
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
