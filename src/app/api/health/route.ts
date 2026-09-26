import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db/pool';

export const dynamic = 'force-dynamic';

/** Health check para o Docker/monitorização: verifica que a app responde e que a BD está acessível. */
export async function GET() {
  try {
    await getPool().query('select 1');
    return NextResponse.json({ ok: true, db: 'up' }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    console.error('health: db unreachable', e);
    return NextResponse.json({ ok: false, db: 'down' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
