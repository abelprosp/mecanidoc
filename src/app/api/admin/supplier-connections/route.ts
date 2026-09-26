import { NextRequest, NextResponse } from 'next/server';
import { requireMasterUser } from '@/lib/admin-auth-server';
import { PROVIDER_PRESETS } from '@/lib/supplier-connections/providers';
import { listConnections, upsertConnection } from '@/lib/supplier-connections/store';

export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireMasterUser();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const connections = await listConnections();
    return NextResponse.json({
      providers: PROVIDER_PRESETS.map(({ fields, ...p }) => ({
        ...p,
        fieldCount: fields.length,
      })),
      connections,
    });
  } catch (e) {
    console.error('supplier-connections list:', e);
    return NextResponse.json({ error: 'Impossible de lister les connexions.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireMasterUser();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 });
  }

  const provider = String(body.provider || '');
  const name = String(body.name || '');
  const values = (body.values && typeof body.values === 'object' ? body.values : {}) as Record<string, unknown>;

  try {
    const connection = await upsertConnection({
      id: typeof body.id === 'string' ? body.id : undefined,
      provider,
      name,
      isActive: body.isActive !== false,
      autoSync: Boolean(body.autoSync),
      syncIntervalMinutes: Number(body.syncIntervalMinutes) || 1440,
      values,
      createdBy: auth.user.id,
    });
    return NextResponse.json({ ok: true, connection });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Échec de l’enregistrement';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
