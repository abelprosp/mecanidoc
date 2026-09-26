import 'server-only';

import { createHash } from 'crypto';
import { decryptSecret, encryptSecret } from '@/lib/supplier-api/crypto';

/** Cifra/decifra segredos da aplicação (AES-256-GCM derivado de AUTH_SECRET). */
export const encrypt = encryptSecret;
export const decrypt = decryptSecret;

export function sha256Hex(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function encryptJson(value: unknown): string {
  return encryptSecret(JSON.stringify(value ?? {}));
}

export function decryptJson<T = Record<string, unknown>>(payload: string | null | undefined): T {
  if (!payload) return {} as T;
  try {
    return JSON.parse(decryptSecret(payload)) as T;
  } catch {
    return {} as T;
  }
}
