import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { withAdminContext } from '@/lib/db/pool';

export const SESSION_COOKIE = 'mecanidoc_session';
const SESSION_DAYS = 7;
const MFA_CHALLENGE_MINUTES = 5;
/** Cache curta da versão de sessão por utilizador (evita uma consulta por pedido). */
const VERSION_CACHE_MS = 30_000;

export type SessionUser = {
  id: string;
  email: string;
  /** Versão da sessão no momento da emissão; muda ao revogar sessões. */
  sv?: number;
};

function getSecretKey() {
  const secret = process.env.AUTH_SECRET || process.env.JWT_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error('AUTH_SECRET não configurado (mínimo 16 caracteres).');
  }
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({ email: user.email, sv: user.sv ?? 1, typ: 'session' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(getSecretKey());
}

// ---------------------------------------------------------------------------
// Revogação: users.session_version tem de coincidir com o `sv` do token.
// ---------------------------------------------------------------------------
const versionCache = new Map<string, { v: number; at: number }>();

export async function getSessionVersion(userId: string): Promise<number | null> {
  const cached = versionCache.get(userId);
  if (cached && Date.now() - cached.at < VERSION_CACHE_MS) return cached.v;
  try {
    const v = await withAdminContext(async (client) => {
      const { rows } = await client.query<{ session_version: number }>(
        'select session_version from public.users where id = $1',
        [userId]
      );
      return rows[0] ? Number(rows[0].session_version) : null;
    });
    if (v !== null) versionCache.set(userId, { v, at: Date.now() });
    return v;
  } catch (e) {
    // Coluna ainda não migrada ou BD indisponível: não bloquear o login.
    console.error('[auth] session_version indisponível:', e instanceof Error ? e.message : e);
    return null;
  }
}

/** Incrementa a versão (invalida todas as sessões) e devolve a nova. */
export async function bumpSessionVersion(userId: string): Promise<number> {
  const v = await withAdminContext(async (client) => {
    const { rows } = await client.query<{ session_version: number }>(
      'update public.users set session_version = session_version + 1, updated_at = now() where id = $1 returning session_version',
      [userId]
    );
    return rows[0] ? Number(rows[0].session_version) : 1;
  });
  versionCache.set(userId, { v, at: Date.now() });
  return v;
}

export function forgetSessionVersion(userId: string) {
  versionCache.delete(userId);
}

export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    const id = payload.sub;
    const email = payload.email;
    if (!id || typeof email !== 'string') return null;
    if (payload.typ && payload.typ !== 'session') return null;
    const sv = typeof payload.sv === 'number' ? payload.sv : 1;
    const current = await getSessionVersion(id);
    if (current !== null && current !== sv) return null; // sessão revogada
    return { id, email, sv };
  } catch {
    return null;
  }
}

export async function getSessionUserFromCookies(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

// ---------------------------------------------------------------------------
// Desafio MFA: token curto emitido após password correta, trocado por sessão.
// ---------------------------------------------------------------------------
export async function createMfaChallengeToken(user: { id: string; email: string }): Promise<string> {
  return new SignJWT({ email: user.email, typ: 'mfa' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${MFA_CHALLENGE_MINUTES}m`)
    .sign(getSecretKey());
}

export async function verifyMfaChallengeToken(token: string): Promise<{ id: string; email: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (payload.typ !== 'mfa' || !payload.sub || typeof payload.email !== 'string') return null;
    return { id: payload.sub, email: payload.email };
  } catch {
    return null;
  }
}

function cookieSecure(): boolean {
  // Produção: sempre Secure. A exceção (HTTP puro sem proxy TLS) tem de ser explícita,
  // para que uma NEXT_PUBLIC_APP_URL mal configurada não desligue a proteção.
  if (process.env.NODE_ENV === 'production') {
    if (process.env.ALLOW_INSECURE_COOKIES === '1') {
      console.warn('[auth] ALLOW_INSECURE_COOKIES=1 — cookie de sessão sem flag Secure.');
      return false;
    }
    return true;
  }
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || '').trim().toLowerCase();
  return appUrl.startsWith('https://');
}

export function sessionCookieOptions(maxAgeSeconds = SESSION_DAYS * 24 * 60 * 60) {
  return {
    httpOnly: true,
    secure: cookieSecure(),
    sameSite: 'lax' as const,
    path: '/',
    maxAge: maxAgeSeconds,
  };
}
