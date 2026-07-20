import 'server-only';

import { createCipheriv, createDecipheriv, createHash, randomBytes, scryptSync } from 'crypto';

const PREFIX = 'mdk_';
const ENC_PREFIX = 'enc:v1:';

function getSecret(): Buffer {
  const secret = process.env.AUTH_SECRET || process.env.JWT_SECRET || '';
  if (!secret || secret.length < 16) {
    throw new Error('AUTH_SECRET não configurado (mínimo 16 caracteres).');
  }
  return scryptSync(secret, 'mecanidoc-supplier-api', 32);
}

export function hashApiKey(rawKey: string): string {
  return createHash('sha256').update(rawKey).digest('hex');
}

export function generateApiKey(): { rawKey: string; keyPrefix: string; keyHash: string } {
  const rawKey = `${PREFIX}${randomBytes(24).toString('hex')}`;
  return {
    rawKey,
    keyPrefix: rawKey.slice(0, 12),
    keyHash: hashApiKey(rawKey),
  };
}

export function encryptSecret(plain: string): string {
  const key = getSecret();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${ENC_PREFIX}${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
}

export function decryptSecret(payload: string): string {
  if (!payload.startsWith(ENC_PREFIX)) return payload;
  const key = getSecret();
  const parts = payload.slice(ENC_PREFIX.length).split(':');
  if (parts.length !== 3) throw new Error('Segredo cifrado inválido');
  const [ivB64, tagB64, dataB64] = parts;
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}
