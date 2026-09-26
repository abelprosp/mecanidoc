import 'server-only';

import { Pool, type PoolClient } from 'pg';

let pool: Pool | null = null;

/**
 * Modo de elevação para operações administrativas:
 *  - `set_role`: a ligação usa um utilizador sem privilégios (ex.: mecanidoc_app)
 *    e faz `SET LOCAL ROLE <admin>` (papel NOLOGIN com BYPASSRLS) só dentro da transação.
 *  - `row_security_off`: fallback quando a ligação é dona das tabelas/superutilizador
 *    (ambiente local antigo). RLS não isola nada neste modo — é registado um aviso.
 */
type AdminMode = 'set_role' | 'row_security_off';

let adminModePromise: Promise<AdminMode> | null = null;

export const DB_ADMIN_ROLE = (process.env.DB_ADMIN_ROLE || 'mecanidoc_admin').replace(/[^a-zA-Z0-9_]/g, '');

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

async function detectAdminMode(): Promise<AdminMode> {
  const { rows } = await getPool().query<{
    is_super: boolean;
    bypass_rls: boolean;
    admin_role_exists: boolean;
    can_set_role: boolean;
  }>(
    `select
       (select rolsuper from pg_roles where rolname = current_user) as is_super,
       (select rolbypassrls from pg_roles where rolname = current_user) as bypass_rls,
       exists (select 1 from pg_roles where rolname = $1) as admin_role_exists,
       pg_has_role(current_user, $1, 'MEMBER') as can_set_role`,
    [DB_ADMIN_ROLE]
  );
  const info = rows[0];

  if (info?.is_super || info?.bypass_rls) {
    const msg =
      `[db] A ligação PostgreSQL usa um utilizador com superuser/BYPASSRLS (${info.is_super ? 'superuser' : 'bypassrls'}). ` +
      'As políticas RLS NÃO isolam dados neste modo. Configure DATABASE_URL com o papel mecanidoc_app (ver docker/postgres/init/01-roles.sh).';
    if (process.env.NODE_ENV === 'production') console.error(msg);
    else console.warn(msg);
    return 'row_security_off';
  }

  if (info?.admin_role_exists && info?.can_set_role) {
    return 'set_role';
  }

  console.error(
    `[db] Papel administrativo "${DB_ADMIN_ROLE}" não existe ou o utilizador atual não é membro. ` +
      'Operações de servidor (login, checkout, webhooks) vão falhar. Execute docker/postgres/init/01-roles.sh e 99-grants.sql.'
  );
  return 'row_security_off';
}

export function getAdminMode(): Promise<AdminMode> {
  if (!adminModePromise) {
    adminModePromise = detectAdminMode().catch((error) => {
      adminModePromise = null;
      throw error;
    });
  }
  return adminModePromise;
}

async function elevate(client: PoolClient, mode: AdminMode) {
  if (mode === 'set_role') {
    await client.query(`SET LOCAL ROLE ${DB_ADMIN_ROLE}`);
  } else {
    await client.query(`SET LOCAL row_security = off`);
  }
}

// Linhas por defeito tipadas como `any`, tal como em `pg`, para não obrigar a anotar
// cada consulta existente; passa um genérico quando quiseres tipagem estrita.
export type AdminQueryable = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query<T = any>(sql: string, params?: unknown[]): Promise<QueryResultLike<T>>;
};

/**
 * Executor para código de servidor que corre SQL direto (suporte, jobs). Cada
 * `query` corre numa transação curta com o papel administrativo, pelo que nunca deve
 * ser usado para pedidos em nome de um utilizador final (não há RLS).
 */
export function getAdminPool(): AdminQueryable {
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async query<T = any>(sql: string, params: unknown[] = []) {
      return withAdminContext(async (client) => {
        const result = await client.query(sql, params);
        return { rows: result.rows as T[], rowCount: result.rowCount };
      });
    },
  };
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
    try {
      await client.query('ROLLBACK');
    } catch {
      /* ignore */
    }
    throw error;
  } finally {
    client.release();
  }
}

export async function withAdminContext<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const mode = await getAdminMode();
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    await elevate(client, mode);
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      /* ignore */
    }
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
