import 'server-only';

import { Pool, type PoolClient } from 'pg';

let pool: Pool | null = null;

export function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
  if (!url) {
    throw new Error('DATABASE_URL não configurado. Use PostgreSQL local (Docker) ou defina DATABASE_URL.');
  }
  return url;
}

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({ connectionString: getDatabaseUrl() });
  }
  return pool;
}

export async function withUserContext<T>(
  userId: string | null | undefined,
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    if (userId) {
      await client.query(`SELECT set_config('app.current_user_id', $1, true)`, [userId]);
    }
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function withAdminContext<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    await client.query(`SET LOCAL row_security = off`);
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export type DbError = {
  message: string;
  code?: string;
  details?: string;
};

export function toDbError(error: unknown): DbError {
  if (error instanceof Error) {
    const pg = error as Error & { code?: string; detail?: string };
    return { message: pg.message, code: pg.code, details: pg.detail };
  }
  return { message: 'Erro desconhecido' };
}

export type QueryResultLike<T> = {
  rows: T[];
  rowCount: number | null;
};

export async function query<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
  client?: PoolClient
): Promise<QueryResultLike<T>> {
  const runner = client || getPool();
  const result = await runner.query(sql, params);
  return { rows: result.rows as T[], rowCount: result.rowCount };
}
