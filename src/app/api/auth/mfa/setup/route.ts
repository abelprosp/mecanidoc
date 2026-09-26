import { NextResponse } from 'next/server';
import { getSessionUserFromCookies } from '@/lib/auth/session';
import { beginMfaSetup, MfaError } from '@/lib/auth/mfa';

/** Gera segredo + QR code para a app de autenticação (MFA ainda inativa até /enable). */
export async function POST() {
  const session = await getSessionUserFromCookies();
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  try {
    const setup = await beginMfaSetup(session.id);
    return NextResponse.json(setup, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    if (e instanceof MfaError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error('[auth/mfa/setup]', e);
    return NextResponse.json({ error: 'Service indisponible.' }, { status: 500 });
  }
}
