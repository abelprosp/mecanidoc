import { NextRequest, NextResponse } from 'next/server';
import { requireMasterUser } from '@/lib/admin-auth-server';
import { getProvider } from '@/lib/supplier-connections/providers';
import { deleteConnection, getConnection, upsertConnection } from '@/lib/supplier-connections/store';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, ctx: Ctx) {
  const auth = await requireMasterUser();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { id } = await ctx.params;
  const conn = await getConnection(id);
  if (!conn) return NextResponse.json({ error: 'Introuvable' }, { status: 404 });
  const provider = getProvider(conn.provider);
  const { secrets: _s, ...publicConn } = conn;
  void _s;
  return NextResponse.json({ connection: publicConn, provider });
}

export async function PUT(request: NextRequest, ctx: Ctx) {
  const auth = await requireMasterUser();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { id } = await ctx.params;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const existing = await getConnection(id);
  if (!existing) return NextResponse.json({ error: 'Introuvable' }, { status: 404 });

  try {
    const connection = await upsertConnection({
      id,
      provider: existing.provider,
      name: String(body.name || existing.name),
      isActive: body.isActive !== false,
      autoSync: Boolean(body.autoSync),
      syncIntervalMinutes: Number(body.syncIntervalMinutes) || existing.sync_interval_minutes,
      values: (body.values && typeof body.values === 'object' ? body.values : {}) as Record<string, unknown>,
      createdBy: auth.user.id,
    });
    return NextResponse.json({ ok: true, connection });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erreur' }, { status: 400 });
  }
}

export async function DELETE(_request: NextRequest, ctx: Ctx) {
  const auth = await requireMasterUser();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { id } = await ctx.params;
  await deleteConnection(id);
  return NextResponse.json({ ok: true });
}
