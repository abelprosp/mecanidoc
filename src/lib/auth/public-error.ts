import { publicDbErrorMessage } from '@/lib/db/errors';

/** Mensagens de infraestrutura nunca devem aparecer no ecrã de login. */
const INFRA =
  /password authentication failed|failed for user|econnrefused|etimedout|enotfound|postgres|relation |column |syntax error|database|pool|timeout|undefined column|permission denied/i;

export function publicAuthError(raw: unknown, fallback = 'Erreur lors de la connexion'): string {
  const msg = raw instanceof Error ? raw.message : String(raw ?? '');
  if (!msg.trim()) return fallback;
  if (/MECANIDOC_APP_DB_PASSWORD|mecanidoc_app|Base de données indisponible|Configuration serveur|Postgres tourne/i.test(msg)) {
    return publicDbErrorMessage();
  }
  if (INFRA.test(msg)) return fallback;
  return msg;
}
