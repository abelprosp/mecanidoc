import 'server-only';

import { randomUUID } from 'crypto';
import type { PoolClient } from 'pg';
import { query, toDbError, type DbError } from './pool';

type Filter = {
  type: 'eq' | 'in' | 'not' | 'gte' | 'lte' | 'ilike' | 'neq' | 'or';
  column: string;
  value: unknown;
  op?: string;
};

type OrderBy = { column: string; ascending: boolean };
type EmbedSpec = { name: string; columns: string; nested?: EmbedSpec[] };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DbResult<T = any> = {
  data: T | null;
  error: DbError | null;
  count?: number | null;
};

export type DbOperation = 'select' | 'insert' | 'update' | 'delete' | 'upsert';

/** Limite máximo de linhas devolvidas por uma única consulta. */
export const MAX_QUERY_LIMIT = 1000;
/** Limite aplicado quando o chamador não indica nenhum. */
export const DEFAULT_QUERY_LIMIT = 500;

const TABLE_FK: Record<string, Record<string, { table: string; localKey: string; foreignKey: string; many?: boolean }>> = {
  products: {
    brands: { table: 'brands', localKey: 'brand_id', foreignKey: 'id' },
  },
  orders: {
    order_items: { table: 'order_items', localKey: 'id', foreignKey: 'order_id', many: true },
    order_shipments: { table: 'order_shipments', localKey: 'id', foreignKey: 'order_id', many: true },
    supplier_orders: { table: 'supplier_orders', localKey: 'id', foreignKey: 'order_id', many: true },
  },
  order_items: {
    products: { table: 'products', localKey: 'product_id', foreignKey: 'id' },
    garages: { table: 'garages', localKey: 'garage_id', foreignKey: 'id' },
    orders: { table: 'orders', localKey: 'order_id', foreignKey: 'id' },
  },
};

const IDENT_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

export class DbValidationError extends Error {
  code = 'DB_VALIDATION';
}

/** Garante que `name` é um identificador SQL simples (coluna/tabela). */
export function assertIdent(name: string, what = 'identificador'): string {
  if (typeof name !== 'string' || !IDENT_RE.test(name)) {
    throw new DbValidationError(`${what} inválido: ${JSON.stringify(name)}`);
  }
  return name;
}

function quoteIdent(name: string) {
  return `"${assertIdent(name).replace(/"/g, '""')}"`;
}

function parseEmbeds(selectRaw: string): { columns: string; embeds: EmbedSpec[] } {
  const embeds: EmbedSpec[] = [];
  let rest = selectRaw.trim();

  const embedRegex = /(\w+)\s*\(([^()]*(?:\([^()]*\)[^()]*)*)\)/g;
  let match: RegExpExecArray | null;
  while ((match = embedRegex.exec(rest)) !== null) {
    embeds.push({ name: assertIdent(match[1], 'relação'), columns: match[2].trim() });
  }
  rest = rest.replace(embedRegex, '').replace(/,\s*,/g, ',').replace(/,\s*$/g, '').trim();
  const columns = rest.replace(/^,\s*/, '') || '*';
  return { columns, embeds };
}

/**
 * Converte uma lista de colunas (`a, b, specs->>width`) numa lista SQL segura.
 * Qualquer expressão fora de identificador simples ou extração JSONB é rejeitada.
 */
function sqlSelectList(columns: string): string {
  const trimmed = columns.trim();
  if (!trimmed || trimmed === '*') return '*';
  return trimmed
    .split(',')
    .map((part) => {
      const col = part.trim();
      if (!col || col === '*') return '*';
      return sqlColumnRef(col);
    })
    .join(', ');
}

/** Coluna SQL — suporta extração JSONB (`specs->>width`). */
function sqlColumnRef(column: string): string {
  const jsonText = column.match(/^([a-zA-Z_][a-zA-Z0-9_]*)->>([a-zA-Z_][a-zA-Z0-9_]*)$/);
  if (jsonText) {
    return `${quoteIdent(jsonText[1])}->>'${jsonText[2]}'`;
  }
  return quoteIdent(column);
}

function normalizeLimit(n: unknown): number | null {
  if (n == null) return null;
  const num = typeof n === 'number' ? n : Number(n);
  if (!Number.isFinite(num) || num < 0) {
    throw new DbValidationError('limit inválido');
  }
  return Math.min(Math.floor(num), MAX_QUERY_LIMIT);
}

async function attachNested(
  parentRow: Record<string, unknown>,
  embed: EmbedSpec,
  parentTable: string,
  client?: PoolClient
) {
  const rel = TABLE_FK[parentTable]?.[embed.name];
  if (!rel) return;
  const fk = parentRow[rel.localKey];
  if (!fk) return;
  const childCols = sqlSelectList(embed.columns);
  const { rows } = await query<Record<string, unknown>>(
    `SELECT ${childCols} FROM ${quoteIdent(rel.table)} WHERE ${quoteIdent(rel.foreignKey)} = $1 LIMIT 1`,
    [fk],
    client
  );
  if (rows[0]) parentRow[embed.name] = rows[0];
}

export class QueryBuilder {
  private table: string;
  private client: PoolClient | undefined;
  private userId: string | null | undefined;
  private admin: boolean;
  private operation: DbOperation = 'select';
  private selectRaw = '*';
  /** Colunas devolvidas por RETURNING em insert/update/upsert. */
  private returningRaw = '*';
  private countOnly = false;
  private headOnly = false;
  private filters: Filter[] = [];
  private orders: OrderBy[] = [];
  private limitN: number | null = null;
  private payload: Record<string, unknown> | Record<string, unknown>[] | null = null;
  private singleMode: 'none' | 'single' | 'maybe' = 'none';

  constructor(table: string, client?: PoolClient, userId?: string | null, admin = false) {
    this.table = assertIdent(table, 'tabela');
    this.client = client;
    this.userId = userId;
    this.admin = admin;
  }

  setClient(client: PoolClient) {
    this.client = client;
  }

  getOperation(): DbOperation {
    return this.operation;
  }

  getTable(): string {
    return this.table;
  }

  serialize() {
    return {
      table: this.table,
      operation: this.operation,
      select: this.selectRaw,
      returning: this.returningRaw,
      countOnly: this.countOnly,
      payload: this.payload ?? undefined,
      filters: this.filters,
      orders: this.orders,
      limit: this.limitN ?? undefined,
      singleMode: this.singleMode,
    };
  }

  /**
   * Em modo leitura define a projeção. Depois de insert/update/upsert define apenas
   * as colunas devolvidas (RETURNING) — não altera a operação.
   */
  select(columns = '*', options?: { count?: 'exact'; head?: boolean }) {
    if (this.operation !== 'select') {
      this.returningRaw = columns || '*';
      return this;
    }
    this.selectRaw = columns || '*';
    if (options?.count === 'exact' && options?.head) {
      this.countOnly = true;
      this.headOnly = true;
    }
    return this;
  }

  /** Usado por /api/db para repor a projeção RETURNING serializada. */
  returning(columns: string) {
    this.returningRaw = columns || '*';
    return this;
  }

  insert(values: Record<string, unknown> | Record<string, unknown>[]) {
    this.operation = 'insert';
    this.payload = values;
    return this;
  }

  update(values: Record<string, unknown>) {
    this.operation = 'update';
    this.payload = values;
    return this;
  }

  upsert(values: Record<string, unknown> | Record<string, unknown>[]) {
    this.operation = 'upsert';
    this.payload = values;
    return this;
  }

  delete() {
    this.operation = 'delete';
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push({ type: 'eq', column, value });
    return this;
  }

  in(column: string, values: unknown[]) {
    this.filters.push({ type: 'in', column, value: values });
    return this;
  }

  not(column: string, op: string, value: unknown) {
    this.filters.push({ type: 'not', column, value, op });
    return this;
  }

  gte(column: string, value: unknown) {
    this.filters.push({ type: 'gte', column, value });
    return this;
  }

  lte(column: string, value: unknown) {
    this.filters.push({ type: 'lte', column, value });
    return this;
  }

  ilike(column: string, pattern: string) {
    this.filters.push({ type: 'ilike', column, value: pattern });
    return this;
  }

  neq(column: string, value: unknown) {
    this.filters.push({ type: 'neq', column, value });
    return this;
  }

  or(filter: string) {
    this.filters.push({ type: 'or', column: '', value: filter });
    return this;
  }

  contains(column: string, value: Record<string, unknown>) {
    this.filters.push({ type: 'eq', column, value: JSON.stringify(value), op: 'contains' });
    return this;
  }

  order(column: string, opts?: { ascending?: boolean }) {
    this.orders.push({ column, ascending: opts?.ascending !== false });
    return this;
  }

  limit(n: number) {
    this.limitN = normalizeLimit(n);
    return this;
  }

  single() {
    this.singleMode = 'single';
    return this;
  }

  maybeSingle() {
    this.singleMode = 'maybe';
    return this;
  }

  then<TResult1 = DbResult, TResult2 = never>(
    onfulfilled?: ((value: DbResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ) {
    return this.execute().then(onfulfilled, onrejected);
  }

  private buildWhere(startIndex = 1): { clause: string; params: unknown[] } {
    const params: unknown[] = [];
    const parts: string[] = [];
    let idx = startIndex;

    for (const f of this.filters) {
      if (f.op === 'contains') {
        parts.push(`${quoteIdent(f.column)} @> $${idx++}::jsonb`);
        params.push(f.value);
        continue;
      }
      if (f.type === 'eq') {
        parts.push(`${sqlColumnRef(f.column)} = $${idx++}`);
        params.push(f.value);
      } else if (f.type === 'in') {
        const values = Array.isArray(f.value) ? f.value : [];
        if (!values.length) {
          parts.push('false');
        } else {
          parts.push(`${sqlColumnRef(f.column)} = ANY($${idx++})`);
          params.push(values);
        }
      } else if (f.type === 'not') {
        if (f.op === 'is' && f.value === null) {
          parts.push(`${sqlColumnRef(f.column)} IS NOT NULL`);
        } else {
          parts.push(`${sqlColumnRef(f.column)} IS DISTINCT FROM $${idx++}`);
          params.push(f.value);
        }
      } else if (f.type === 'gte') {
        parts.push(`${sqlColumnRef(f.column)} >= $${idx++}`);
        params.push(f.value);
      } else if (f.type === 'lte') {
        parts.push(`${sqlColumnRef(f.column)} <= $${idx++}`);
        params.push(f.value);
      } else if (f.type === 'ilike') {
        parts.push(`${sqlColumnRef(f.column)} ILIKE $${idx++}`);
        params.push(String(f.value ?? ''));
      } else if (f.type === 'neq') {
        parts.push(`${sqlColumnRef(f.column)} <> $${idx++}`);
        params.push(f.value);
      } else if (f.type === 'or') {
        const orParts: string[] = [];
        for (const item of String(f.value).split(',')) {
          const trimmed = item.trim();
          const match = trimmed.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\.(ilike|eq)\.(.+)$/);
          if (!match) continue;
          const col = match[1];
          const op = match[2];
          const val = match[3];
          if (op === 'ilike') {
            orParts.push(`${sqlColumnRef(col)} ILIKE $${idx++}`);
            params.push(val);
          } else if (op === 'eq') {
            orParts.push(`${sqlColumnRef(col)} = $${idx++}`);
            params.push(val);
          }
        }
        if (orParts.length) parts.push(`(${orParts.join(' OR ')})`);
      }
    }

    return { clause: parts.length ? `WHERE ${parts.join(' AND ')}` : '', params };
  }

  private async attachEmbeds(rows: Record<string, unknown>[], embeds: EmbedSpec[]) {
    if (!embeds.length || !rows.length) return rows;
    const tableMap = TABLE_FK[this.table] || {};

    for (const embed of embeds) {
      const rel = tableMap[embed.name];
      if (!rel) continue;

      if (rel.many) {
        const parentIds = rows.map((r) => r.id).filter(Boolean);
        if (!parentIds.length) continue;
        const nestedMatch = embed.columns.match(/(\w+)\s*\(([^)]+)\)/);
        let baseCols = '*';
        const nested: EmbedSpec[] = [];
        if (nestedMatch) {
          nested.push({ name: assertIdent(nestedMatch[1], 'relação'), columns: nestedMatch[2].trim() });
        } else {
          baseCols = sqlSelectList(embed.columns);
        }

        const { rows: children } = await query<Record<string, unknown>>(
          `SELECT ${baseCols}, ${quoteIdent(rel.foreignKey)} AS __parent_id
           FROM ${quoteIdent(rel.table)}
           WHERE ${quoteIdent(rel.foreignKey)} = ANY($1)`,
          [parentIds],
          this.client
        );

        // Carrega relações aninhadas em lote (evita uma consulta por linha filha).
        if (nested.length) {
          for (const n of nested) {
            const nestedRel = TABLE_FK[rel.table]?.[n.name];
            if (!nestedRel || nestedRel.many) continue;
            const fkValues = Array.from(
              new Set(children.map((c) => c[nestedRel.localKey]).filter(Boolean))
            );
            if (!fkValues.length) continue;
            const { rows: nestedRows } = await query<Record<string, unknown>>(
              `SELECT ${sqlSelectList(n.columns)}, ${quoteIdent(nestedRel.foreignKey)} AS __child_id
               FROM ${quoteIdent(nestedRel.table)}
               WHERE ${quoteIdent(nestedRel.foreignKey)} = ANY($1)`,
              [fkValues],
              this.client
            );
            const byId = new Map(nestedRows.map((r) => [r.__child_id, r]));
            for (const child of children) {
              const hit = byId.get(child[nestedRel.localKey]);
              if (hit) {
                const copy = { ...hit };
                delete copy.__child_id;
                child[n.name] = copy;
              }
            }
          }
        }

        const byParent = new Map<unknown, Record<string, unknown>[]>();
        for (const child of children) {
          const parentId = child.__parent_id;
          delete child.__parent_id;
          const list = byParent.get(parentId) || [];
          list.push(child);
          byParent.set(parentId, list);
        }
        for (const row of rows) {
          row[embed.name] = byParent.get(row.id) || [];
        }
      } else {
        const fkValues = rows.map((r) => r[rel.localKey]).filter(Boolean);
        if (!fkValues.length) continue;
        const childCols = sqlSelectList(embed.columns);
        const { rows: children } = await query<Record<string, unknown>>(
          `SELECT ${childCols}, ${quoteIdent(rel.foreignKey)} AS __child_id FROM ${quoteIdent(rel.table)} WHERE ${quoteIdent(rel.foreignKey)} = ANY($1)`,
          [fkValues],
          this.client
        );
        const byId = new Map(children.map((c) => [c.__child_id, c]));
        for (const row of rows) {
          const child = byId.get(row[rel.localKey]);
          if (child) {
            const copy = { ...child };
            delete copy.__child_id;
            row[embed.name] = copy;
          }
        }
      }
    }

    return rows;
  }

  private payloadRows(): Record<string, unknown>[] {
    const rows = Array.isArray(this.payload) ? this.payload : this.payload ? [this.payload] : [];
    for (const row of rows) {
      if (!row || typeof row !== 'object' || Array.isArray(row)) {
        throw new DbValidationError('payload inválido');
      }
      for (const key of Object.keys(row)) assertIdent(key, 'coluna');
    }
    return rows;
  }

  async execute(): Promise<DbResult> {
    if (typeof window !== 'undefined' && !this.client) {
      try {
        const res = await fetch('/api/db', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(this.serialize()),
        });
        return (await res.json()) as DbResult;
      } catch (error) {
        return { data: null, error: toDbError(error) };
      }
    }

    try {
      if (this.operation === 'select') {
        if (this.countOnly) {
          const { clause, params } = this.buildWhere();
          const { rows } = await query<{ count: string }>(
            `SELECT COUNT(*)::int AS count FROM ${quoteIdent(this.table)} ${clause}`,
            params,
            this.client
          );
          return { data: null, error: null, count: Number(rows[0]?.count ?? 0) };
        }

        const { columns, embeds } = parseEmbeds(this.selectRaw);
        const { clause, params } = this.buildWhere();
        let sql = `SELECT ${sqlSelectList(columns)} FROM ${quoteIdent(this.table)} ${clause}`;
        if (this.orders.length) {
          sql += ` ORDER BY ${this.orders.map((o) => `${sqlColumnRef(o.column)} ${o.ascending ? 'ASC' : 'DESC'}`).join(', ')}`;
        }
        const effectiveLimit =
          this.singleMode !== 'none' ? Math.min(this.limitN ?? 2, 2) : (this.limitN ?? DEFAULT_QUERY_LIMIT);
        sql += ` LIMIT ${effectiveLimit}`;

        const { rows } = await query<Record<string, unknown>>(sql, params, this.client);
        const dataRows = await this.attachEmbeds(rows, embeds);

        if (this.singleMode === 'single') {
          if (dataRows.length !== 1) {
            return { data: null, error: { message: 'JSON object requested, multiple (or no) rows returned', code: 'PGRST116' } };
          }
          return { data: dataRows[0], error: null };
        }
        if (this.singleMode === 'maybe') {
          return { data: dataRows[0] ?? null, error: null };
        }
        return { data: dataRows, error: null };
      }

      if (this.operation === 'insert' || this.operation === 'upsert') {
        const rows = this.payloadRows();
        if (!rows.length) return { data: [], error: null };
        const inserted: Record<string, unknown>[] = [];
        const returning = sqlSelectList(this.returningRaw);

        for (const row of rows) {
          const data = { ...row };
          if (!data.id) data.id = randomUUID();
          const cols = Object.keys(data);
          const vals = Object.values(data);
          const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');

          let sql = `INSERT INTO ${quoteIdent(this.table)} (${cols.map(quoteIdent).join(', ')})
                     VALUES (${placeholders})`;

          if (this.operation === 'upsert') {
            const updates = cols.filter((c) => c !== 'id').map((c) => `${quoteIdent(c)} = EXCLUDED.${quoteIdent(c)}`);
            if (updates.length) {
              sql += ` ON CONFLICT (id) DO UPDATE SET ${updates.join(', ')}`;
            } else {
              sql += ` ON CONFLICT (id) DO NOTHING`;
            }
          }

          sql += ` RETURNING ${returning}`;
          const { rows: result } = await query<Record<string, unknown>>(sql, vals, this.client);
          if (result[0]) inserted.push(result[0]);
        }

        if (this.singleMode === 'single') {
          if (inserted.length !== 1) {
            return { data: null, error: { message: 'JSON object requested, multiple (or no) rows returned', code: 'PGRST116' } };
          }
          return { data: inserted[0], error: null };
        }
        if (this.singleMode === 'maybe') {
          return { data: inserted[0] ?? null, error: null };
        }
        return { data: inserted, error: null };
      }

      if (this.operation === 'update') {
        const [data] = this.payloadRows();
        if (!data) return { data: [], error: null };
        const cols = Object.keys(data);
        if (!cols.length) return { data: [], error: null };
        const vals = Object.values(data);
        const { clause, params } = this.buildWhere(cols.length + 1);
        if (!clause) {
          throw new DbValidationError('update sem filtro não é permitido');
        }
        const setClause = cols.map((c, i) => `${quoteIdent(c)} = $${i + 1}`).join(', ');
        const sql = `UPDATE ${quoteIdent(this.table)} SET ${setClause} ${clause} RETURNING ${sqlSelectList(this.returningRaw)}`;
        const { rows } = await query<Record<string, unknown>>(sql, [...vals, ...params], this.client);
        if (this.singleMode === 'single') {
          if (rows.length !== 1) {
            return { data: null, error: { message: 'JSON object requested, multiple (or no) rows returned', code: 'PGRST116' } };
          }
          return { data: rows[0], error: null };
        }
        if (this.singleMode === 'maybe') return { data: rows[0] ?? null, error: null };
        return { data: rows, error: null };
      }

      if (this.operation === 'delete') {
        const { clause, params } = this.buildWhere();
        if (!clause) {
          throw new DbValidationError('delete sem filtro não é permitido');
        }
        await query(`DELETE FROM ${quoteIdent(this.table)} ${clause}`, params, this.client);
        return { data: null, error: null };
      }

      return { data: null, error: { message: 'Operação não suportada' } };
    } catch (error) {
      // Dentro de transação: relançar para ROLLBACK. Devolver { error } e depois
      // COMMIT deixa o Postgres em "current transaction is aborted" (HTTP 500).
      if (this.client) throw error;
      return { data: null, error: toDbError(error) };
    }
  }
}
