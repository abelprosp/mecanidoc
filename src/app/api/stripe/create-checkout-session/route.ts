import { NextRequest, NextResponse } from 'next/server';
import { getStripe, isStripeConfigured } from '@/lib/stripe-wrapper';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import {
  STRIPE_CURRENCY,
  STRIPE_MIN_AMOUNT_CENTS,
  toStripeAmountCents,
} from '@/lib/stripe-payments';

function resolveOrigin(request: NextRequest): string {
  const headerOrigin = request.headers.get('origin');
  if (headerOrigin) return headerOrigin;
  try {
    return new URL(request.url).origin;
  } catch {
    return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  }
}

export async function POST(request: NextRequest) {
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: 'Stripe is not configured. Please set STRIPE_SECRET_KEY in environment variables.' },
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

  try {
    const body = await request.json().catch(() => null);
    const orderId = body?.orderId;

    if (!orderId || typeof orderId !== 'string') {
      return NextResponse.json({ error: 'orderId is required' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .eq('user_id', user.id)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.payment_status === 'paid' || order.status === 'paid') {
      return NextResponse.json(
        { error: 'Order is already paid', alreadyPaid: true },
        { status: 409 }
      );
    }

    if (order.payment_status === 'refunded') {
      return NextResponse.json(
        { error: 'Order was refunded and cannot be paid again' },
        { status: 409 }
      );
    }

    const amountCents = toStripeAmountCents(order.total_amount);
    if (amountCents < STRIPE_MIN_AMOUNT_CENTS) {
      return NextResponse.json(
        { error: `Invalid order amount (minimum ${STRIPE_MIN_AMOUNT_CENTS} cents)` },
        { status: 400 }
      );
    }

    // Réutiliser une session Checkout encore ouverte (évite sessions orphelines)
    if (order.stripe_checkout_session_id) {
      try {
        const existing = await stripe.checkout.sessions.retrieve(order.stripe_checkout_session_id);
        if (
          existing.status === 'open' &&
          existing.client_secret &&
          existing.metadata?.order_id === orderId
        ) {
          return NextResponse.json({
            clientSecret: existing.client_secret,
            sessionId: existing.id,
            reused: true,
          });
        }
      } catch (retrieveError) {
        console.warn('Could not reuse checkout session:', retrieveError);
      }
    }

    const origin = resolveOrigin(request);

    // Idempotence pour les retries réseau ; nouvelle clé si une session précédente existe déjà
    const idempotencyKey = order.stripe_checkout_session_id
      ? `checkout-session-${orderId}-${Date.now()}`
      : `checkout-session-${orderId}`;

    const session = await stripe.checkout.sessions.create(
      {
        mode: 'payment',
        ui_mode: 'embedded',
        locale: 'fr',
        line_items: [
          {
            price_data: {
              currency: STRIPE_CURRENCY,
              unit_amount: amountCents,
              product_data: {
                name: `Commande MecaniDoc #${orderId.slice(0, 8)}`,
                description: 'Pneus et services MecaniDoc',
              },
            },
            quantity: 1,
          },
        ],
        return_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}&order_id=${encodeURIComponent(orderId)}`,
        metadata: {
          order_id: orderId,
          user_id: user.id,
        },
        // Copie les métadonnées sur le PaymentIntent (webhooks payment_intent.*)
        payment_intent_data: {
          metadata: {
            order_id: orderId,
            user_id: user.id,
          },
        },
        customer_email: order.contact_email || undefined,
      },
      { idempotencyKey }
    );

    if (!session.client_secret) {
      return NextResponse.json(
        { error: 'Stripe did not return a client secret for embedded checkout.' },
        { status: 500 }
      );
    }

    const { error: updateError } = await supabase
      .from('orders')
      .update({
        stripe_checkout_session_id: session.id,
        payment_status: 'pending',
        payment_method: 'stripe',
      })
      .eq('id', orderId);

    if (updateError) {
      // Colonne absente ou autre : on logue mais on renvoie quand même le secret
      // (le webhook peut encore marquer paid via metadata.order_id)
      console.warn('Could not persist checkout session id on order:', updateError.message);
    }

    return NextResponse.json({
      clientSecret: session.client_secret,
      sessionId: session.id,
    });
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
