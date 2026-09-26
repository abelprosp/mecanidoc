import { NextRequest, NextResponse } from 'next/server';
import { requireMasterUser } from '@/lib/admin-auth-server';
import { fulfillNeumaticosAndresOrder } from '@/lib/neumaticos-andres/fulfill-order';
import { getNaIntegrationSettings, getSupabaseAdmin } from '@/lib/neumaticos-andres/server-helpers';
import { withAdminContext } from '@/lib/db/pool';

export async function POST(request: NextRequest) {
  const auth = await requireMasterUser();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const orderId = typeof body.orderId === 'string' ? body.orderId : '';
    if (!orderId) {
      return NextResponse.json({ error: 'orderId é obrigatório.' }, { status: 400 });
    }

    // Envio manual só para encomendas pagas — nunca expedir sem pagamento confirmado.
    const { rows } = await withAdminContext((client) =>
      client.query<{ payment_status: string | null }>(
        'select payment_status from public.orders where id = $1',
        [orderId]
      )
    );
    if (!rows[0]) {
      return NextResponse.json({ ok: false, error: 'Commande introuvable.' }, { status: 404 });
    }
    if (rows[0].payment_status !== 'paid') {
      return NextResponse.json(
        { ok: false, error: `Commande non payée (statut: ${rows[0].payment_status ?? 'inconnu'}).` },
        { status: 409 }
      );
    }

    const admin = getSupabaseAdmin();
    const settings = await getNaIntegrationSettings();
    const result = await fulfillNeumaticosAndresOrder(admin, orderId, settings);

    await withAdminContext((client) =>
      client.query(
        `update public.orders
            set supplier_fulfillment_attempts = coalesce(supplier_fulfillment_attempts, 0) + 1,
                supplier_fulfillment_last_error = $2
          where id = $1`,
        [orderId, result.ok ? null : (result.error || 'Fulfillment failed').slice(0, 1000)]
      )
    );

    return NextResponse.json(result);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Falha ao enviar pedido ao fornecedor';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
