import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserFromCookies } from '@/lib/auth/session';
import { MfaError, regenerateRecoveryCodes } from '@/lib/auth/mfa';
import { clientIp, rateLimit } from '@/lib/rate-limit';

/** Regenera os códigos de recuperação (exige um código TOTP válido). */
export async function POST(request: NextRequest) {
  const session = await getSessionUserFromCookies();
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const rl = rateLimit(`mfa-recovery:${session.id}:${clientIp(request)}`, { limit: 6, windowMs: 10 * 60 * 1000 });
  if (!rl.ok) return NextResponse.json({ error: 'Trop de tentatives.' }, { status: 429 });

  const body = await request.json().catch(() => ({}));
  const code = typeof body.code === 'string' ? body.code : '';
  try {
    const recoveryCodes = await regenerateRecoveryCodes(session.id, code);
    return NextResponse.json({ ok: true, recoveryCodes }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    if (e instanceof MfaError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error('[auth/mfa/recovery-codes]', e);
    return NextResponse.json({ error: 'Service indisponible.' }, { status: 500 });
  }
}
