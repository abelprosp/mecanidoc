import 'server-only';

import QRCode from 'qrcode';
import { withAdminContext } from '@/lib/db/pool';
import { verifyPassword } from '@/lib/auth/password';
import { decrypt, encrypt, sha256Hex } from '@/lib/crypto/secrets';
import { generateRecoveryCodes, generateTotpSecret, normalizeRecoveryCode, otpauthUri, verifyTotp } from '@/lib/auth/totp';

export class MfaError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

type UserMfaRow = {
  id: string;
  email: string;
  password_hash: string;
  mfa_enabled: boolean;
  mfa_secret_enc: string | null;
  mfa_recovery_hashes: string[] | null;
};

async function loadUser(userId: string): Promise<UserMfaRow> {
  return withAdminContext(async (client) => {
    const { rows } = await client.query<UserMfaRow>(
      `select id, email, password_hash, mfa_enabled, mfa_secret_enc, mfa_recovery_hashes
         from public.users where id = $1`,
      [userId]
    );
    if (!rows[0]) throw new MfaError('Utilisateur introuvable.', 404);
    return rows[0];
  });
}

export type SecurityStatus = {
  email: string;
  emailConfirmed: boolean;
  mfaEnabled: boolean;
  mfaEnabledAt: string | null;
  recoveryCodesLeft: number;
  sessionVersion: number;
};

export async function getSecurityStatus(userId: string): Promise<SecurityStatus | null> {
  return withAdminContext(async (client) => {
    const { rows } = await client.query<{
      email: string;
      email_confirmed_at: Date | null;
      mfa_enabled: boolean;
      mfa_enabled_at: Date | null;
      mfa_recovery_hashes: string[] | null;
      session_version: number;
    }>(
      `select email, email_confirmed_at, mfa_enabled, mfa_enabled_at, mfa_recovery_hashes, session_version
         from public.users where id = $1`,
      [userId]
    );
    const r = rows[0];
    if (!r) return null;
    return {
      email: r.email,
      emailConfirmed: r.email_confirmed_at !== null,
      mfaEnabled: Boolean(r.mfa_enabled),
      mfaEnabledAt: r.mfa_enabled_at ? new Date(r.mfa_enabled_at).toISOString() : null,
      recoveryCodesLeft: r.mfa_recovery_hashes?.length ?? 0,
      sessionVersion: Number(r.session_version ?? 1),
    };
  });
}

/** Gera um segredo (ainda não ativo) e devolve QR + URI para a app de autenticação. */
export async function beginMfaSetup(userId: string): Promise<{ secret: string; otpauth: string; qrDataUrl: string }> {
  const user = await loadUser(userId);
  if (user.mfa_enabled) throw new MfaError('La double authentification est déjà activée.', 409);
  const secret = generateTotpSecret();
  await withAdminContext((client) =>
    client.query(`update public.users set mfa_secret_enc = $2, updated_at = now() where id = $1`, [userId, encrypt(secret)])
  );
  const otpauth = otpauthUri(secret, user.email);
  const qrDataUrl = await QRCode.toDataURL(otpauth, { margin: 1, width: 220 });
  return { secret, otpauth, qrDataUrl };
}

/** Confirma o código da app e ativa a MFA. Devolve os códigos de recuperação (mostrados uma só vez). */
export async function enableMfa(userId: string, code: string): Promise<{ recoveryCodes: string[] }> {
  const user = await loadUser(userId);
  if (user.mfa_enabled) throw new MfaError('La double authentification est déjà activée.', 409);
  if (!user.mfa_secret_enc) throw new MfaError('Commencez par générer le QR code.', 400);
  const secret = decrypt(user.mfa_secret_enc);
  if (verifyTotp(secret, code) === null) throw new MfaError('Code incorrect. Vérifiez l’heure de votre téléphone et réessayez.', 400);

  const recoveryCodes = generateRecoveryCodes(8);
  const hashes = recoveryCodes.map((c) => sha256Hex(normalizeRecoveryCode(c)));
  await withAdminContext((client) =>
    client.query(
      `update public.users
          set mfa_enabled = true, mfa_enabled_at = now(), mfa_recovery_hashes = $2, updated_at = now()
        where id = $1`,
      [userId, hashes]
    )
  );
  return { recoveryCodes };
}

/** Desativa a MFA: exige a password atual e um código válido (TOTP ou recuperação). */
export async function disableMfa(userId: string, password: string, code: string): Promise<void> {
  const user = await loadUser(userId);
  if (!user.mfa_enabled) throw new MfaError('La double authentification n’est pas activée.', 409);
  if (!(await verifyPassword(password, user.password_hash))) throw new MfaError('Mot de passe incorrect.', 400);
  const ok = await verifyMfaCode(user, code);
  if (!ok) throw new MfaError('Code incorrect.', 400);
  await withAdminContext((client) =>
    client.query(
      `update public.users
          set mfa_enabled = false, mfa_enabled_at = null, mfa_secret_enc = null, mfa_recovery_hashes = '{}', updated_at = now()
        where id = $1`,
      [userId]
    )
  );
}

/** Verifica TOTP ou código de recuperação (consumido). */
async function verifyMfaCode(user: UserMfaRow, code: string): Promise<boolean> {
  const trimmed = code.trim();
  if (user.mfa_secret_enc && /^\d{6}$/.test(trimmed.replace(/\s+/g, ''))) {
    if (verifyTotp(decrypt(user.mfa_secret_enc), trimmed) !== null) return true;
  }
  const hash = sha256Hex(normalizeRecoveryCode(trimmed));
  const hashes = user.mfa_recovery_hashes || [];
  if (!hashes.includes(hash)) return false;
  await withAdminContext((client) =>
    client.query(`update public.users set mfa_recovery_hashes = array_remove(mfa_recovery_hashes, $2), updated_at = now() where id = $1`, [
      user.id,
      hash,
    ])
  );
  return true;
}

/** Usado no login: valida o segundo fator. */
export async function verifyMfaForLogin(userId: string, code: string): Promise<boolean> {
  const user = await loadUser(userId);
  if (!user.mfa_enabled) return true;
  return verifyMfaCode(user, code);
}

/** Regenera códigos de recuperação (exige código TOTP válido). */
export async function regenerateRecoveryCodes(userId: string, code: string): Promise<string[]> {
  const user = await loadUser(userId);
  if (!user.mfa_enabled || !user.mfa_secret_enc) throw new MfaError('La double authentification n’est pas activée.', 409);
  if (verifyTotp(decrypt(user.mfa_secret_enc), code) === null) throw new MfaError('Code incorrect.', 400);
  const recoveryCodes = generateRecoveryCodes(8);
  const hashes = recoveryCodes.map((c) => sha256Hex(normalizeRecoveryCode(c)));
  await withAdminContext((client) =>
    client.query(`update public.users set mfa_recovery_hashes = $2, updated_at = now() where id = $1`, [userId, hashes])
  );
  return recoveryCodes;
}
