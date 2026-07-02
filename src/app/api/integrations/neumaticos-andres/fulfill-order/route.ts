import { NextRequest, NextResponse } from 'next/server';
import { requireMasterUser } from '@/lib/admin-auth-server';
import { fulfillNeumaticosAndresOrder } from '@/lib/neumaticos-andres/fulfill-order';
import { getNaIntegrationSettings, getSupabaseAdmin } from '@/lib/neumaticos-andres/server-helpers';

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

    const admin = getSupabaseAdmin();
    const settings = await getNaIntegrationSettings();
    const result = await fulfillNeumaticosAndresOrder(admin, orderId, settings);

    return NextResponse.json(result);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Falha ao enviar pedido ao fornecedor';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
