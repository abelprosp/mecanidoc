import { NextRequest, NextResponse } from 'next/server';
import { bumpSessionVersion, createSessionToken, getSessionUserFromCookies, sessionCookieOptions, SESSION_COOKIE } from '@/lib/auth/session';

/**
 * Revoga todas as sessões do utilizador (incrementa `session_version`).
 * Por defeito mantém a sessão atual (emite um novo cookie); `{ includeCurrent: true }` termina também esta.
 */
export async function POST(request: NextRequest) {
  const session = await getSessionUserFromCookies();
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const includeCurrent = body?.includeCurrent === true;

  try {
    const sv = await bumpSessionVersion(session.id);
    if (includeCurrent) {
      const response = NextResponse.json({ ok: true, loggedOut: true });
      response.cookies.set(SESSION_COOKIE, '', { ...sessionCookieOptions(0), maxAge: 0 });
      return response;
    }
    const token = await createSessionToken({ id: session.id, email: session.email, sv });
    const response = NextResponse.json({ ok: true, loggedOut: false });
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    return response;
  } catch (e) {
    console.error('[auth/logout-all]', e);
    return NextResponse.json({ error: 'Service indisponible.' }, { status: 500 });
  }
}
