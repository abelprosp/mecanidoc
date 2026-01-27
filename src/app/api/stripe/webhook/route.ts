import { NextRequest, NextResponse } from 'next/server';
import { stripe, isStripeConfigured } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';

// Tipo Stripe opcional
type StripeEvent = {
  type: string;
  data: {
    object: any;
  };
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(request: NextRequest) {
  if (!isStripeConfigured() || !stripe || !webhookSecret) {
    return NextResponse.json(
      { error: 'Stripe webhook is not configured. Please set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET in environment variables.' },
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
    switch (event.type) {
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
