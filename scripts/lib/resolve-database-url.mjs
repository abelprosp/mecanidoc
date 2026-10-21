/**
 * Ajusta DATABASE_URL para scripts Node a correr no host.
 * O hostname "postgres" só resolve dentro da rede Docker Compose.
 */
import { existsSync } from 'fs';

const DEFAULT_HOST_URL = 'postgresql://mecanidoc:mecanidoc@127.0.0.1:5434/mecanidoc';

function enc(value) {
  return encodeURIComponent(String(value ?? ''));
}

/**
 * URL do SUPERUTILIZADOR para seeds/import no host.
 * Não usa mecanidoc_app (esse papel não pode escrever em public.users).
 * Porta publicada do compose de produção: 5434 (5432 na VPS é outra stack).
 */
export function resolveSuperuserDatabaseUrl() {
  const user = process.env.POSTGRES_USER || 'mecanidoc';
  const pass = process.env.POSTGRES_PASSWORD || '';
  const db = process.env.POSTGRES_DB || 'mecanidoc';
  const inside = runningInsideDocker();
  const host = inside ? 'postgres' : '127.0.0.1';
  const port = inside ? '5432' : (process.env.MECANIDOC_POSTGRES_PORT || '5434');

  if (pass) {
    return {
      url: `postgresql://${enc(user)}:${enc(pass)}@${host}:${port}/${enc(db)}`,
      rewritten: !inside,
      fromDefault: false,
      via: 'POSTGRES_PASSWORD',
    };
  }

  const raw = (process.env.DATABASE_URL || '').trim();
  if (raw) {
    try {
      const parsed = new URL(raw);
      if (!inside && parsed.hostname === 'postgres') {
        parsed.hostname = '127.0.0.1';
        if (parsed.port === '5432' || !parsed.port) parsed.port = process.env.MECANIDOC_POSTGRES_PORT || '5434';
      }
      return { url: parsed.toString(), rewritten: true, fromDefault: false, via: 'DATABASE_URL' };
    } catch {
      /* ignore */
    }
  }

  return { url: DEFAULT_HOST_URL, rewritten: false, fromDefault: true, via: 'default' };
}

function runningInsideDocker() {
  return existsSync('/.dockerenv');
}

/**
 * @param {string | undefined} url
 * @returns {{ url: string, rewritten: boolean, fromDefault: boolean }}
 */
export function resolveDatabaseUrl(url) {
  const raw = (url || '').trim();
  if (!raw) {
    return { url: DEFAULT_HOST_URL, rewritten: false, fromDefault: true };
  }

  if (runningInsideDocker()) {
    return { url: raw, rewritten: false, fromDefault: false };
  }

  try {
    const parsed = new URL(raw);
    if (parsed.hostname === 'postgres') {
      parsed.hostname = 'localhost';
      return { url: parsed.toString(), rewritten: true, fromDefault: false };
    }
  } catch {
    // URL inválida — deixa o pg falhar com a mensagem original
  }

  return { url: raw, rewritten: false, fromDefault: false };
}

export function formatDatabaseUrlHint(err, connectionUrl) {
  const msg = err?.message || String(err);
  const url = connectionUrl || '';
  const usedPostgresHost = /@(postgres)[:/]/i.test(url) || /getaddrinfo.*\bpostgres\b/i.test(msg);

  if (/EAI_AGAIN|ENOTFOUND/.test(msg) && (usedPostgresHost || /postgres/i.test(msg))) {
    return (
      '\n\nO hostname "postgres" só funciona dentro da rede Docker Compose.' +
      '\nNo host use localhost (porta publicada):' +
      '\n  Use POSTGRES_USER + POSTGRES_PASSWORD + MECANIDOC_POSTGRES_PORT=5434' +
      '\n  (na VPS a porta publicada é 5434, não 5432).'
    );
  }

  if (/ECONNREFUSED/.test(msg)) {
    return (
      '\n\nPostgres parece offline ou a porta está errada.' +
      '\nNa VPS: 127.0.0.1:5434 (MECANIDOC_POSTGRES_PORT). Não use 5432 — é outra stack.'
    );
  }

  if (/password authentication failed/i.test(msg)) {
    return (
      '\n\nO seed liga como SUPERUSER (POSTGRES_USER / POSTGRES_PASSWORD do .env), não como mecanidoc_app.' +
      '\nConfirme POSTGRES_PASSWORD no .env e a porta 5434. Depois:' +
      '\n  npm run seed:master-admin'
    );
  }

  return '';
}

export { DEFAULT_HOST_URL };
