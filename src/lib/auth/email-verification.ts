import 'server-only';

import { randomBytes } from 'crypto';
import { withAdminContext } from '@/lib/db/pool';
import { publicAppUrl, sendMail } from '@/lib/mailer';
import { sha256Hex } from '@/lib/crypto/secrets';

const TOKEN_TTL_HOURS = 48;

/** Verificação de e-mail obrigatória para comprar? (por defeito não, para não bloquear vendas sem SMTP). */
export function emailVerificationRequired(): boolean {
  return process.env.REQUIRE_EMAIL_VERIFICATION === '1';
}

export async function isEmailConfirmed(userId: string): Promise<boolean> {
  return withAdminContext(async (client) => {
    const { rows } = await client.query<{ email_confirmed_at: Date | null }>(
      'select email_confirmed_at from public.users where id = $1',
      [userId]
    );
    return Boolean(rows[0]?.email_confirmed_at);
  });
}

/** Gera token (uso único, 48 h) e envia o e-mail de confirmação. Devolve false se o envio falhou. */
export async function sendVerificationEmail(userId: string, email: string): Promise<boolean> {
  const token = randomBytes(32).toString('base64url');
  const tokenHash = sha256Hex(token);

  await withAdminContext(async (client) => {
    await client.query(
      `update public.email_verification_tokens set used_at = now()
        where user_id = $1 and used_at is null and expires_at > now()`,
      [userId]
    );
    await client.query(
      `insert into public.email_verification_tokens (user_id, token_hash, expires_at)
       values ($1, $2, now() + ($3 || ' hours')::interval)`,
      [userId, tokenHash, String(TOKEN_TTL_HOURS)]
    );
  });

  const link = `${publicAppUrl()}/api/auth/verify-email?token=${encodeURIComponent(token)}`;
  const text = [
    'Bienvenue chez MecaniDoc !',
    '',
    'Confirmez votre adresse e-mail en ouvrant ce lien (valable 48 heures) :',
    link,
    '',
    "Si vous n'avez pas créé de compte, ignorez cet e-mail.",
    '',
    'MecaniDoc',
  ].join('\n');
  const html = `
    <p>Bienvenue chez MecaniDoc !</p>
    <p>Confirmez votre adresse e-mail (lien valable 48 heures) :</p>
    <p><a href="${link}" style="display:inline-block;padding:10px 18px;background:#0066CC;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold">Confirmer mon e-mail</a></p>
    <p style="font-size:12px;color:#555">Ou copiez ce lien : <br/>${link}</p>
    <p>Si vous n'avez pas créé de compte, ignorez cet e-mail.</p>
    <p>MecaniDoc</p>`;

  try {
    return await sendMail({ to: email, subject: 'Confirmez votre adresse e-mail — MecaniDoc', text, html });
  } catch (error) {
    console.error('[email-verification] envoi échoué:', error);
    return false;
  }
}

export type VerifyEmailResult = { ok: true; userId: string } | { ok: false; reason: 'invalid' | 'expired' };

/** Consome o token e marca o e-mail como confirmado. */
export async function verifyEmailToken(token: string): Promise<VerifyEmailResult> {
  if (!token || token.length < 20) return { ok: false, reason: 'invalid' };
  const tokenHash = sha256Hex(token);
  return withAdminContext(async (client) => {
    const { rows } = await client.query<{ id: string; user_id: string; expired: boolean }>(
      `select id, user_id, (expires_at <= now()) as expired
         from public.email_verification_tokens
        where token_hash = $1 and used_at is null
        for update`,
      [tokenHash]
    );
    const row = rows[0];
    if (!row) return { ok: false as const, reason: 'invalid' as const };
    if (row.expired) return { ok: false as const, reason: 'expired' as const };
    await client.query(
      `update public.users set email_confirmed_at = coalesce(email_confirmed_at, now()), updated_at = now() where id = $1`,
      [row.user_id]
    );
    await client.query(`update public.email_verification_tokens set used_at = now() where id = $1`, [row.id]);
    return { ok: true as const, userId: row.user_id };
  });
}
