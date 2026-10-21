import { NextRequest, NextResponse } from 'next/server';
import { isValidEmail, normalizeEmail } from '@/lib/auth/validation';
import { sendMail } from '@/lib/mailer';
import { clientIp, rateLimit } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 });
  }

  const ip = clientIp(request);
  const limited = rateLimit(`affiliate:${ip}`, { limit: 5, windowMs: 60 * 60 * 1000 });
  if (!limited.ok) {
    return NextResponse.json(
      { error: 'Trop de demandes. Réessayez plus tard.' },
      { status: 429, headers: { 'Retry-After': String(limited.retryAfterSec) } }
    );
  }

  const name = String(body.name ?? '').trim().slice(0, 120);
  const email = normalizeEmail(body.email);
  const site = String(body.site ?? '').trim().slice(0, 300);
  const message = String(body.message ?? '').trim().slice(0, 2000);

  if (!name || !isValidEmail(email) || message.length < 10) {
    return NextResponse.json({ error: 'Veuillez renseigner un nom, un e-mail valide et un message.' }, { status: 400 });
  }

  const to = (process.env.AFFILIATE_INBOX || process.env.SMTP_FROM || 'contact@mecanidoc.com').trim();
  const text = [
    `Demande d'affiliation MecaniDoc`,
    `Nom: ${name}`,
    `E-mail: ${email}`,
    `Site: ${site || '(non renseigné)'}`,
    '',
    message,
  ].join('\n');

  const sent = await sendMail({
    to,
    subject: `[Affiliation] ${name}`,
    text,
  });

  if (!sent) {
    console.warn('[affiliate/interest] SMTP indisponible — demande enregistrée dans les journaux uniquement.', { name, email, site });
  }

  return NextResponse.json({ ok: true });
}
