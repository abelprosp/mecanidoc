import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserFromCookies } from '@/lib/auth/session';
import { disableMfa, MfaError } from '@/lib/auth/mfa';
import { clientIp, rateLimit } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  const session = await getSessionUserFromCookies();
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const rl = rateLimit(`mfa-disable:${session.id}:${clientIp(request)}`, { limit: 6, windowMs: 10 * 60 * 1000 });
  if (!rl.ok) return NextResponse.json({ error: 'Trop de tentatives.' }, { status: 429 });

  const body = await request.json().catch(() => ({}));
  const password = typeof body.password === 'string' ? body.password : '';
  const code = typeof body.code === 'string' ? body.code : '';
  try {
    await disableMfa(session.id, password, code);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof MfaError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error('[auth/mfa/disable]', e);
    return NextResponse.json({ error: 'Service indisponible.' }, { status: 500 });
  }
}
