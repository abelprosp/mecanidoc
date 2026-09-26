import { NextRequest, NextResponse } from 'next/server';
import { createSessionToken, getSessionVersion, sessionCookieOptions, SESSION_COOKIE, verifyMfaChallengeToken } from '@/lib/auth/session';
import { verifyMfaForLogin } from '@/lib/auth/mfa';
import { clientIp, rateLimit } from '@/lib/rate-limit';

/** Segunda etapa do login: troca o desafio + código TOTP/recuperação por uma sessão. */
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 });
  }
  const challenge = typeof body.challenge === 'string' ? body.challenge : '';
  const code = typeof body.code === 'string' ? body.code.trim() : '';
  if (!challenge || !code) {
    return NextResponse.json({ error: 'Code requis.' }, { status: 400 });
  }

  const user = await verifyMfaChallengeToken(challenge);
  if (!user) {
    return NextResponse.json({ error: 'Session expirée. Reconnectez-vous.' }, { status: 401 });
  }

  const rl = rateLimit(`mfa:${user.id}:${clientIp(request)}`, { limit: 6, windowMs: 10 * 60 * 1000 });
  if (!rl.ok) {
    return NextResponse.json({ error: 'Trop de tentatives. Réessayez plus tard.' }, { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } });
  }

  try {
    const ok = await verifyMfaForLogin(user.id, code);
    if (!ok) return NextResponse.json({ error: 'Code incorrect.' }, { status: 401 });
    const sv = (await getSessionVersion(user.id)) ?? 1;
    const token = await createSessionToken({ id: user.id, email: user.email, sv });
    const response = NextResponse.json({ user: { id: user.id, email: user.email } });
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    return response;
  } catch (e) {
    console.error('[auth/mfa/verify]', e);
    return NextResponse.json({ error: 'Service temporairement indisponible.' }, { status: 503 });
  }
}
