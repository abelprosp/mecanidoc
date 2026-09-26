import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserFromCookies } from '@/lib/auth/session';
import { enableMfa, MfaError } from '@/lib/auth/mfa';
import { clientIp, rateLimit } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  const session = await getSessionUserFromCookies();
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const rl = rateLimit(`mfa-enable:${session.id}:${clientIp(request)}`, { limit: 10, windowMs: 10 * 60 * 1000 });
  if (!rl.ok) return NextResponse.json({ error: 'Trop de tentatives.' }, { status: 429 });

  const body = await request.json().catch(() => ({}));
  const code = typeof body.code === 'string' ? body.code : '';
  try {
    const { recoveryCodes } = await enableMfa(session.id, code);
    return NextResponse.json({ ok: true, recoveryCodes }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    if (e instanceof MfaError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error('[auth/mfa/enable]', e);
    return NextResponse.json({ error: 'Service indisponible.' }, { status: 500 });
  }
}
