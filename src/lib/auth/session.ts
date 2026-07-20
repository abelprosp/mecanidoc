import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

export const SESSION_COOKIE = 'mecanidoc_session';
const SESSION_DAYS = 7;

export type SessionUser = {
  id: string;
  email: string;
};

function getSecretKey() {
  const secret = process.env.AUTH_SECRET || process.env.JWT_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error('AUTH_SECRET não configurado (mínimo 16 caracteres).');
  }
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({ email: user.email })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(getSecretKey());
}

export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    const id = payload.sub;
    const email = payload.email;
    if (!id || typeof email !== 'string') return null;
    return { id, email };
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

function cookieSecure(): boolean {
  // Em produção HTTP (ex.: http://IP:3000 na VPS) Secure=true impede o browser de guardar o cookie.
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || '').trim().toLowerCase();
  if (appUrl.startsWith('http://')) return false;
  if (appUrl.startsWith('https://')) return true;
  return process.env.NODE_ENV === 'production';
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
