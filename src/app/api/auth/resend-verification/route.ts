import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserFromCookies } from '@/lib/auth/session';
import { isEmailConfirmed, sendVerificationEmail } from '@/lib/auth/email-verification';
import { clientIp, rateLimit } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  const session = await getSessionUserFromCookies();
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const rl = rateLimit(`resend-verif:${session.id}:${clientIp(request)}`, { limit: 3, windowMs: 15 * 60 * 1000 });
  if (!rl.ok) {
    return NextResponse.json({ error: 'Trop de demandes. Réessayez dans quelques minutes.' }, { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } });
  }
  try {
    if (await isEmailConfirmed(session.id)) return NextResponse.json({ ok: true, alreadyConfirmed: true });
    const sent = await sendVerificationEmail(session.id, session.email);
    if (!sent) return NextResponse.json({ error: "L'envoi d'e-mail n'est pas configuré. Contactez le support." }, { status: 503 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[auth/resend-verification]', e);
    return NextResponse.json({ error: 'Service indisponible.' }, { status: 500 });
  }
}
