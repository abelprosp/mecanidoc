import { NextRequest, NextResponse } from 'next/server';
import { requestPasswordReset } from '@/lib/auth/password-reset';
import { isValidEmail, normalizeEmail } from '@/lib/auth/validation';
import { clientIp, rateLimit } from '@/lib/rate-limit';

/** Resposta idêntica quer o e-mail exista ou não (evita enumeração de contas). */
export async function POST(request: NextRequest) {
  const ip = clientIp(request);
  const rl = rateLimit(`forgot:${ip}`, { limit: 5, windowMs: 15 * 60 * 1000 });
  if (!rl.ok) {
    return NextResponse.json({ error: 'Trop de demandes. Réessayez plus tard.' }, { status: 429 });
  }

  const body = await request.json().catch(() => ({}));
  const email = normalizeEmail(body?.email);
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: 'Adresse e-mail invalide.' }, { status: 400 });
  }

  const perEmail = rateLimit(`forgot:email:${email}`, { limit: 3, windowMs: 60 * 60 * 1000 });
  if (perEmail.ok) {
    requestPasswordReset(email).catch((error) => console.error('[forgot-password]', error));
  }

  return NextResponse.json({
    ok: true,
    message: 'Si un compte existe pour cette adresse, un e-mail de réinitialisation a été envoyé.',
  });
}
