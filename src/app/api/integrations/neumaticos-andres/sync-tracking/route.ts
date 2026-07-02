import { NextRequest, NextResponse } from 'next/server';
import { requireMasterUser } from '@/lib/admin-auth-server';
import { syncNeumaticosAndresTracking } from '@/lib/neumaticos-andres/sync-tracking';
import { getSupabaseAdmin } from '@/lib/neumaticos-andres/server-helpers';

export async function POST(request: NextRequest) {
  const auth = await requireMasterUser();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const orderIds = Array.isArray(body.orderIds)
      ? body.orderIds.filter((id: unknown) => typeof id === 'string')
      : undefined;

    const admin = getSupabaseAdmin();
    const result = await syncNeumaticosAndresTracking(admin, { orderIds });

    return NextResponse.json({ ok: true, ...result });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Falha na sincronização de tracking';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
