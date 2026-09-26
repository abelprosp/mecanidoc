import 'server-only';

import { createHash, randomBytes } from 'crypto';
import { withAdminContext } from '@/lib/db/pool';
import { hashPassword } from '@/lib/auth/password';
import { publicAppUrl, sendMail } from '@/lib/mailer';
import { forgetSessionVersion } from '@/lib/auth/session';

const TOKEN_TTL_MINUTES = 60;

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Gera um token de recuperação e envia o e-mail. Devolve sempre sem revelar se o
 * e-mail existe (a rota responde 200 em ambos os casos).
 */
export async function requestPasswordReset(email: string): Promise<void> {
  const normalized = email.trim().toLowerCase();

  const user = await withAdminContext(async (client) => {
    const { rows } = await client.query<{ id: string; email: string }>(
      'select id, email from public.users where lower(email) = $1 limit 1',
      [normalized]
    );
    return rows[0] || null;
  });
  if (!user) return;

  const token = randomBytes(32).toString('base64url');
  const tokenHash = hashToken(token);

  await withAdminContext(async (client) => {
    // Invalida pedidos anteriores ainda válidos
    await client.query(
      `update public.password_reset_tokens set used_at = now()
        where user_id = $1 and used_at is null and expires_at > now()`,
      [user.id]
    );
    await client.query(
      `insert into public.password_reset_tokens (user_id, token_hash, expires_at)
       values ($1, $2, now() + ($3 || ' minutes')::interval)`,
      [user.id, tokenHash, String(TOKEN_TTL_MINUTES)]
    );
  });

  const link = `${publicAppUrl()}/auth/reset-password?token=${encodeURIComponent(token)}`;
  const text = [
    'Bonjour,',
    '',
    'Vous avez demandé la réinitialisation de votre mot de passe MecaniDoc.',
    `Ce lien est valable ${TOKEN_TTL_MINUTES} minutes :`,
    link,
    '',
    "Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail : votre mot de passe reste inchangé.",
    '',
    'MecaniDoc',
  ].join('\n');
  const html = `
    <p>Bonjour,</p>
    <p>Vous avez demandé la réinitialisation de votre mot de passe MecaniDoc.</p>
    <p>Ce lien est valable ${TOKEN_TTL_MINUTES} minutes :</p>
    <p><a href="${link}" style="display:inline-block;padding:10px 18px;background:#0066CC;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold">Réinitialiser mon mot de passe</a></p>
    <p style="font-size:12px;color:#555">Ou copiez ce lien : <br/>${link}</p>
    <p>Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail : votre mot de passe reste inchangé.</p>
    <p>MecaniDoc</p>`;

  const sent = await sendMail({ to: user.email, subject: 'Réinitialisation de votre mot de passe MecaniDoc', text, html }).catch(
    (error) => {
      console.error('[password-reset] envoi e-mail échoué:', error);
      return false;
    }
  );
  if (!sent) {
    console.error(`[password-reset] e-mail non envoyé pour ${user.email} (SMTP non configuré).`);
  }
}

export type ResetResult = { ok: true } | { ok: false; error: string };

/** Consome o token (uso único) e grava a nova password. */
export async function resetPasswordWithToken(token: string, newPassword: string): Promise<ResetResult> {
  if (!token || token.length < 20) return { ok: false, error: 'Lien invalide.' };
  const tokenHash = hashToken(token);
  const passwordHash = await hashPassword(newPassword);

  return withAdminContext(async (client) => {
    const { rows } = await client.query<{ id: string; user_id: string }>(
      `select id, user_id from public.password_reset_tokens
        where token_hash = $1 and used_at is null and expires_at > now()
        for update`,
      [tokenHash]
    );
    const row = rows[0];
    if (!row) return { ok: false as const, error: 'Ce lien est invalide ou a expiré. Faites une nouvelle demande.' };

    // Nova password + revogação de todas as sessões existentes (session_version) +
    // o e-mail fica confirmado (o utilizador provou ter acesso à caixa de correio).
    await client.query(
      `update public.users
          set password_hash = $2, password_changed_at = now(), session_version = session_version + 1,
              email_confirmed_at = coalesce(email_confirmed_at, now()), updated_at = now()
        where id = $1`,
      [row.user_id, passwordHash]
    );
    await client.query(`update public.password_reset_tokens set used_at = now() where id = $1`, [row.id]);
    forgetSessionVersion(row.user_id);
    return { ok: true as const };
  });
}
