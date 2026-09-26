import { NextResponse } from 'next/server';
import { getSessionUserFromCookies } from '@/lib/auth/session';
import { getSecurityStatus } from '@/lib/auth/mfa';

/** Estado de segurança da conta autenticada (e-mail confirmado, MFA, códigos restantes). */
export async function GET() {
  const session = await getSessionUserFromCookies();
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  try {
    const status = await getSecurityStatus(session.id);
    if (!status) return NextResponse.json({ error: 'Introuvable' }, { status: 404 });
    return NextResponse.json({ user: { id: session.id, email: session.email }, security: status }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    console.error('[auth/me]', e);
    return NextResponse.json({ error: 'Service indisponible.' }, { status: 500 });
  }
}
