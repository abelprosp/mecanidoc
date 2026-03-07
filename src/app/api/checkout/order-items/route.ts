import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * Insere order_items via conexão direta PostgreSQL, contornando o schema cache do Supabase.
 * Requer SUPABASE_DB_URL no .env (Connection string do Dashboard > Settings > Database).
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { orderId, items } = body as { orderId: string; items: Array<{ order_id: string; product_id: string; quantity: number; price: number; garage_id: string | null }> };
    if (!orderId || !items?.length) {
      return NextResponse.json({ error: 'orderId and items required' }, { status: 400 });
    }

    const dbUrl = process.env.SUPABASE_DB_URL;
    if (!dbUrl) {
      console.error('SUPABASE_DB_URL not set');
      return NextResponse.json(
        { error: 'Server config: add SUPABASE_DB_URL to .env (Supabase Dashboard > Settings > Database > Connection string)' },
        { status: 503 }
      );
    }

    const { Client } = await import('pg');
    const client = new Client({ connectionString: dbUrl });
    await client.connect();

    try {
      // Criar tabela se não existir (sem FK para não falhar; evita 404 do schema cache)
      await client.query(`
        create table if not exists public.order_items (
          id uuid default gen_random_uuid() primary key,
          order_id uuid not null,
          product_id uuid not null,
          quantity integer not null default 1,
          price numeric not null,
          garage_id uuid,
          created_at timestamptz default now()
        )
      `);

      // Remover FK em product_id se existir (permite inserir mesmo que o produto já não exista)
      await client.query(`
        alter table public.order_items drop constraint if exists order_items_product_id_fkey;
      `).catch(() => {});

      // Verificar se o pedido pertence ao utilizador
      const orderCheck = await client.query(
        'select user_id from public.orders where id = $1',
        [orderId]
      );
      if (orderCheck.rows.length === 0) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }
      if (orderCheck.rows[0].user_id !== user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      for (const row of items) {
        await client.query(
          `insert into public.order_items (order_id, product_id, quantity, price, garage_id)
           values ($1, $2, $3, $4, $5)`,
          [row.order_id, row.product_id, row.quantity, row.price, row.garage_id || null]
        );
      }

      return NextResponse.json({ ok: true });
    } finally {
      await client.end();
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('order-items API error:', err);
    return NextResponse.json(
      { error: message.includes('relation') ? 'Tabela orders não existe. Execute ensure_orders_columns.sql no Supabase.' : message },
      { status: 500 }
    );
  }
}
