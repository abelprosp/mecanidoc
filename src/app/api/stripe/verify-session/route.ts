import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/neumaticos-andres/server-helpers';
import {
  extractPaymentIntentId,
  markOrderPaid,
  toStripeAmountCents,
} from '@/lib/stripe-payments';
import { getStripe, isStripeConfigured } from '@/lib/stripe-wrapper';
import { createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * Vérifie une Checkout Session côté Stripe et synchronise le statut de la commande.
 * Sert de filet de sécurité si le webhook est en retard (page /checkout/success).
 */
export async function POST(request: NextRequest) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: 'Stripe is not configured' }, { status: 503 });
  }

  const stripe = await getStripe();
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe is not available' }, { status: 503 });
  }

  try {
    const body = await request.json().catch(() => null);
    const sessionId = body?.sessionId;
    const orderId = body?.orderId;

    if (!sessionId || typeof sessionId !== 'string') {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const sessionOrderId = session.metadata?.order_id;

    if (!sessionOrderId) {
      return NextResponse.json({ error: 'Session has no order metadata' }, { status: 400 });
    }

    if (orderId && orderId !== sessionOrderId) {
      return NextResponse.json({ error: 'Order mismatch' }, { status: 400 });
    }

    if (session.metadata?.user_id && session.metadata.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, user_id, payment_status, status, total_amount')
      .eq('id', sessionOrderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const stripePaymentStatus = session.payment_status; // paid | unpaid | no_payment_required
    const sessionStatus = session.status; // open | complete | expired

    if (stripePaymentStatus === 'paid') {
      if (
        typeof session.amount_total === 'number' &&
        session.amount_total > 0 &&
        session.amount_total !== toStripeAmountCents(order.total_amount)
      ) {
        return NextResponse.json(
          {
            status: 'error',
            paymentStatus: order.payment_status,
            stripePaymentStatus,
            sessionStatus,
            orderId: order.id,
            error: 'Amount mismatch',
          },
          { status: 409 }
        );
      }

      // Synchronisation si le webhook n'est pas encore passé
      if (order.payment_status !== 'paid') {
        const admin = getSupabaseAdmin();
        await markOrderPaid(admin, order.id, {
          paymentIntentId: extractPaymentIntentId(session.payment_intent),
          checkoutSessionId: session.id,
          customerId:
            typeof session.customer === 'string'
              ? session.customer
              : session.customer && typeof session.customer === 'object'
                ? (session.customer as { id?: string }).id
                : null,
        });
      }

      return NextResponse.json({
        status: 'paid',
        paymentStatus: 'paid',
        stripePaymentStatus,
        sessionStatus,
        orderId: order.id,
      });
    }

    if (sessionStatus === 'expired') {
      return NextResponse.json({
        status: 'expired',
        paymentStatus: order.payment_status,
        stripePaymentStatus,
        sessionStatus,
        orderId: order.id,
      });
    }

    return NextResponse.json({
      status: stripePaymentStatus === 'unpaid' ? 'unpaid' : 'pending',
      paymentStatus: order.payment_status,
      stripePaymentStatus,
      sessionStatus,
      orderId: order.id,
    });
  } catch (error: any) {
    console.error('Error verifying checkout session:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to verify session' },
      { status: 500 }
    );
  }
}
