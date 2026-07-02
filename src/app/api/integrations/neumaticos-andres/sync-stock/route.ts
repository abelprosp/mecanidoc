import { NextRequest, NextResponse } from 'next/server';
import { requireMasterUser } from '@/lib/admin-auth-server';
import { syncNeumaticosAndresStock } from '@/lib/neumaticos-andres/sync-stock';
import { getSupabaseAdmin } from '@/lib/neumaticos-andres/server-helpers';

export async function POST(request: NextRequest) {
  const auth = await requireMasterUser();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const postCode = typeof body.postCode === 'string' ? body.postCode : undefined;
    const productIds = Array.isArray(body.productIds)
      ? body.productIds.filter((id: unknown) => typeof id === 'string')
      : undefined;

    const admin = getSupabaseAdmin();
    const result = await syncNeumaticosAndresStock(admin, { postCode, productIds });

    return NextResponse.json({ ok: true, ...result });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Falha na sincronização de stock';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
