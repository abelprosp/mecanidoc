/**
 * Ajusta DATABASE_URL para scripts Node a correr no host.
 * O hostname "postgres" só resolve dentro da rede Docker Compose.
 */
import { existsSync } from 'fs';

const DEFAULT_HOST_URL = 'postgresql://mecanidoc:mecanidoc@localhost:5432/mecanidoc';

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
      '\n  DATABASE_URL=postgresql://mecanidoc:mecanidoc@localhost:5432/mecanidoc' +
      '\n\nArranque o Postgres: npm run docker:postgres' +
      '\n(ou: docker compose -f docker-compose.dev.yml up -d  → porta 5433)'
    );
  }

  if (/ECONNREFUSED/.test(msg)) {
    return (
      '\n\nPostgres parece offline ou a porta está errada.' +
      '\nArranque: npm run docker:postgres' +
      '\nDev local (compose.dev): porta 5433 → @localhost:5433'
    );
  }

  return '';
}

export { DEFAULT_HOST_URL };
