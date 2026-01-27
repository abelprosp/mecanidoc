import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const { amount, orderId, customerEmail, customerName } = await request.json();

    if (!amount || !orderId) {
      return NextResponse.json(
        { error: 'Amount and orderId are required' },
        { status: 400 }
      );
    }

    // Verificar autenticação
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verificar se o pedido pertence ao usuário
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .eq('user_id', user.id)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Criar ou buscar customer no Stripe
    let customerId: string | null = null;
    
    if (customerEmail) {
      const customers = await stripe.customers.list({
        email: customerEmail,
        limit: 1,
      });

      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
      } else {
        const customer = await stripe.customers.create({
          email: customerEmail,
          name: customerName,
          metadata: {
            user_id: user.id,
            order_id: orderId,
          },
        });
        customerId = customer.id;
      }
    }

    // Criar PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Converter para centavos
      currency: 'eur',
      customer: customerId || undefined,
      metadata: {
        order_id: orderId,
        user_id: user.id,
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    // Atualizar pedido com payment_intent_id
    await supabase
      .from('orders')
      .update({
        stripe_payment_intent_id: paymentIntent.id,
        stripe_customer_id: customerId,
        payment_status: 'pending',
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
