import { NextRequest, NextResponse } from 'next/server';
import { loginUser } from '@/lib/db/client';
import { createMfaChallengeToken, createSessionToken, sessionCookieOptions, SESSION_COOKIE } from '@/lib/auth/session';
import { normalizeEmail } from '@/lib/auth/validation';
import { clientIp, rateLimit, rateLimitReset } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 });
  }

  const email = normalizeEmail(body.email);
  const password = typeof body.password === 'string' ? body.password : '';

  if (!email || !password) {
    return NextResponse.json({ error: 'E-mail et mot de passe requis.' }, { status: 400 });
  }

  // Limites por IP e por conta (protege contra força bruta e credential stuffing).
  const ip = clientIp(request);
  const ipKey = `login:ip:${ip}`;
  const accountKey = `login:acct:${email}`;
  const ipLimit = rateLimit(ipKey, { limit: 30, windowMs: 15 * 60 * 1000 });
  const acctLimit = rateLimit(accountKey, { limit: 8, windowMs: 15 * 60 * 1000 });
  if (!ipLimit.ok || !acctLimit.ok) {
    const retry = Math.max(ipLimit.retryAfterSec, acctLimit.retryAfterSec);
    return NextResponse.json(
      { error: 'Trop de tentatives de connexion. Réessayez dans quelques minutes.' },
      { status: 429, headers: { 'Retry-After': String(retry) } }
    );
  }

  try {
    const user = await loginUser(email, password);
    rateLimitReset(accountKey);

    // Segundo fator ativo: não emitir sessão; devolver um desafio curto a trocar em /api/auth/mfa/verify.
    if (user.mfaEnabled) {
      const challenge = await createMfaChallengeToken({ id: user.id, email: user.email });
      return NextResponse.json({ mfaRequired: true, challenge });
    }

    const token = await createSessionToken({ id: user.id, email: user.email, sv: user.sessionVersion });
    const response = NextResponse.json({ user: { id: user.id, email: user.email }, emailConfirmed: user.emailConfirmed });
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    return response;
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erreur de connexion';
    const isCredentials = /invalid login credentials/i.test(msg);
    if (isCredentials) {
      return NextResponse.json({ error: 'Email ou mot de passe incorrect.' }, { status: 401 });
    }
    // Erros de configuração/BD → 503 sem detalhes para o cliente; detalhes no log.
    console.error('[auth/login]', msg);
    return NextResponse.json({ error: 'Service temporairement indisponible.' }, { status: 503 });
  }
}
