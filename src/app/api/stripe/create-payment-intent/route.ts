import { NextRequest, NextResponse } from 'next/server';
import { getStripe, isStripeConfigured } from '@/lib/stripe-wrapper';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import {
  STRIPE_CURRENCY,
  STRIPE_MIN_AMOUNT_CENTS,
  toStripeAmountCents,
} from '@/lib/stripe-payments';

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
    const customerEmail =
      typeof body?.customerEmail === 'string' ? body.customerEmail.trim() : '';
    const customerName =
      typeof body?.customerName === 'string' ? body.customerName.trim() : undefined;

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

    // Toujours utiliser le montant serveur — jamais le montant envoyé par le client
    const amountCents = toStripeAmountCents(order.total_amount);
    if (amountCents < STRIPE_MIN_AMOUNT_CENTS) {
      return NextResponse.json(
        { error: `Invalid order amount (minimum ${STRIPE_MIN_AMOUNT_CENTS} cents)` },
        { status: 400 }
      );
    }

    // Réutiliser un PaymentIntent pending encore utilisable
    if (order.stripe_payment_intent_id) {
      try {
        const existing = await stripe.paymentIntents.retrieve(order.stripe_payment_intent_id);
        if (
          ['requires_payment_method', 'requires_confirmation', 'requires_action'].includes(
            existing.status
          ) &&
          existing.amount === amountCents &&
          existing.client_secret
        ) {
          return NextResponse.json({
            clientSecret: existing.client_secret,
            paymentIntentId: existing.id,
            reused: true,
          });
        }
      } catch (retrieveError) {
        console.warn('Could not reuse payment intent:', retrieveError);
      }
    }

    let customerId: string | null = order.stripe_customer_id || null;
    const email = customerEmail || order.contact_email || '';

    if (!customerId && email) {
      const customers = await stripe.customers.list({ email, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
      } else {
        const customer = await stripe.customers.create({
          email,
          name: customerName || order.contact_name || undefined,
          metadata: {
            user_id: user.id,
          },
        });
        customerId = customer.id;
      }
    }

    const idempotencyKey = order.stripe_payment_intent_id
      ? `payment-intent-${orderId}-${amountCents}-${Date.now()}`
      : `payment-intent-${orderId}-${amountCents}`;

    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount: amountCents,
        currency: STRIPE_CURRENCY,
        customer: customerId || undefined,
        metadata: {
          order_id: orderId,
          user_id: user.id,
        },
        automatic_payment_methods: {
          enabled: true,
        },
      },
      { idempotencyKey }
    );

    await supabase
      .from('orders')
      .update({
        stripe_payment_intent_id: paymentIntent.id,
        stripe_customer_id: customerId,
        payment_status: 'pending',
        payment_method: 'stripe',
      })
      .eq('id', orderId);

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error: any) {
    console.error('Error creating payment intent:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create payment intent' },
      { status: 500 }
    );
  }
}
