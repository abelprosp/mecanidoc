/** Falhas de ligação PostgreSQL — nunca são o e-mail/senha do site. */
const DB_DOWN =
  /password authentication failed|failed for user|28P01|econnrefused|etimedout|enotfound|the database system is|too many connections|connection terminated|remaining connection slots|connect ECONN|timeout expired|no pg_hba|database ".*" does not exist/i;

export function isDbUnavailable(error: unknown): boolean {
  if (!error) return false;
  const err = error as { message?: string; code?: string };
  if (err.code === '28P01' || err.code === '57P03' || err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || err.code === 'ETIMEDOUT') {
    return true;
  }
  return DB_DOWN.test(String(err.message || error));
}

export function publicDbErrorMessage(): string {
  return 'Base de données indisponible. Ce n’est pas votre e-mail : sur le serveur, MECANIDOC_APP_DB_PASSWORD doit correspondre au rôle PostgreSQL mecanidoc_app.';
}
