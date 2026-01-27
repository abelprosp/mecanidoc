import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { stripe } from '@/lib/stripe';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verificar se é master ou admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'master') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const status = searchParams.get('status');

    // Buscar pedidos
    let query = supabase
      .from('orders')
      .select(`
        *,
        order_items (
          *,
          products (
            id,
            name,
            base_price
          )
        ),
        profiles (
          id,
          email,
          full_name
        )
      `)
      .order('created_at', { ascending: false });

    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }
    if (status) {
      query = query.eq('payment_status', status);
    }

    const { data: orders, error } = await query;

    if (error) {
      throw error;
    }

    // Buscar informações adicionais do Stripe para pedidos pagos
    const ordersWithStripeData = await Promise.all(
      (orders || []).map(async (order) => {
        if (order.stripe_payment_intent_id && order.payment_status === 'paid') {
          try {
            const paymentIntent = await stripe.paymentIntents.retrieve(
              order.stripe_payment_intent_id
            );
            return {
              ...order,
              stripe_data: {
                payment_method: paymentIntent.payment_method_types[0],
                receipt_url: paymentIntent.charges?.data[0]?.receipt_url,
              },
            };
          } catch (err) {
            console.error('Error fetching Stripe data:', err);
            return order;
          }
        }
        return order;
      })
    );

    // Calcular estatísticas
    const totalSales = ordersWithStripeData
      .filter((o) => o.payment_status === 'paid')
      .reduce((sum, o) => sum + parseFloat(o.total_amount.toString()), 0);

    const totalOrders = ordersWithStripeData.length;
    const paidOrders = ordersWithStripeData.filter((o) => o.payment_status === 'paid').length;
    const pendingOrders = ordersWithStripeData.filter((o) => o.payment_status === 'pending').length;

    return NextResponse.json({
      orders: ordersWithStripeData,
      statistics: {
        totalSales,
        totalOrders,
        paidOrders,
        pendingOrders,
      },
    });
  } catch (error: any) {
    console.error('Error fetching sales:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch sales' },
      { status: 500 }
    );
  }
}
