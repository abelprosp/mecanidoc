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

export type DbResult<T = any> = {
  data: T | null;
  error: DbError | null;
  count?: number | null;
};

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

function parseEmbeds(selectRaw: string): { columns: string; embeds: EmbedSpec[] } {
  const embeds: EmbedSpec[] = [];
  let rest = selectRaw.trim();

  const embedRegex = /(\w+)\s*\(([^()]*(?:\([^()]*\)[^()]*)*)\)/g;
  let match: RegExpExecArray | null;
  while ((match = embedRegex.exec(rest)) !== null) {
    embeds.push({ name: match[1], columns: match[2].trim() });
  }
  rest = rest.replace(embedRegex, '').replace(/,\s*,/g, ',').replace(/,\s*$/g, '').trim();
  const columns = rest.replace(/^,\s*/, '') || '*';
  return { columns, embeds };
}

function quoteIdent(name: string) {
  return `"${name.replace(/"/g, '""')}"`;
}

/** Coluna SQL — suporta extração JSONB (`specs->>width`). */
function sqlColumnRef(column: string): string {
  const jsonText = column.match(/^([a-zA-Z_][a-zA-Z0-9_]*)->>([a-zA-Z_][a-zA-Z0-9_]*)$/);
  if (jsonText) {
    return `${quoteIdent(jsonText[1])}->>'${jsonText[2].replace(/'/g, "''")}'`;
  }
  return quoteIdent(column);
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
  const childCols = embed.columns === '*' ? '*' : embed.columns.split(',').map((c) => c.trim()).join(', ');
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
  private operation: 'select' | 'insert' | 'update' | 'delete' | 'upsert' = 'select';
  private selectRaw = '*';
  private countOnly = false;
  private headOnly = false;
  private filters: Filter[] = [];
  private orders: OrderBy[] = [];
  private limitN: number | null = null;
  private payload: Record<string, unknown> | Record<string, unknown>[] | null = null;
  private singleMode: 'none' | 'single' | 'maybe' = 'none';

  constructor(table: string, client?: PoolClient, userId?: string | null, admin = false) {
    this.table = table;
    this.client = client;
    this.userId = userId;
    this.admin = admin;
  }

  setClient(client: PoolClient) {
    this.client = client;
  }

  serialize() {
    return {
      admin: this.admin,
      table: this.table,
      operation: this.operation,
      select: this.selectRaw,
      countOnly: this.countOnly,
      payload: this.payload ?? undefined,
      filters: this.filters,
      orders: this.orders,
      limit: this.limitN ?? undefined,
      singleMode: this.singleMode,
    };
  }

  select(columns = '*', options?: { count?: 'exact'; head?: boolean }) {
    this.operation = 'select';
    this.selectRaw = columns;
    if (options?.count === 'exact' && options?.head) {
      this.countOnly = true;
      this.headOnly = true;
    }
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
    this.limitN = n;
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
        params.push(f.value);
      } else if (f.type === 'neq') {
        parts.push(`${sqlColumnRef(f.column)} <> $${idx++}`);
        params.push(f.value);
      } else if (f.type === 'or') {
        const orParts: string[] = [];
        for (const item of String(f.value).split(',')) {
          const trimmed = item.trim();
          const match = trimmed.match(/^([a-zA-Z0-9_]+)\.(ilike|eq)\.(.+)$/);
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
        const childCols = embed.columns === '*' ? '*' : embed.columns.split(',').map((c) => c.trim()).join(', ');
        const nestedMatch = embed.columns.match(/(\w+)\s*\(([^)]+)\)/);
        let baseCols = childCols;
        const nested: EmbedSpec[] = [];
        if (nestedMatch) {
          baseCols = '*';
          nested.push({ name: nestedMatch[1], columns: nestedMatch[2].trim() });
        }

        const { rows: children } = await query<Record<string, unknown>>(
          `SELECT ${baseCols}, ${quoteIdent(rel.foreignKey)} AS __parent_id
           FROM ${quoteIdent(rel.table)}
           WHERE ${quoteIdent(rel.foreignKey)} = ANY($1)`,
          [parentIds],
          this.client
        );

        for (const row of rows) {
          const matched = children.filter((c) => c.__parent_id === row.id);
          for (const child of matched) delete child.__parent_id;

          if (nested.length) {
            for (const child of matched) {
              for (const n of nested) {
                await attachNested(child, n, rel.table, this.client);
              }
            }
          }

          row[embed.name] = matched;
        }
      } else {
        const fkValues = rows.map((r) => r[rel.localKey]).filter(Boolean);
        if (!fkValues.length) continue;
        const childCols = embed.columns === '*' ? '*' : embed.columns.split(',').map((c) => c.trim()).join(', ');
        const { rows: children } = await query<Record<string, unknown>>(
          `SELECT ${childCols}, id AS __child_id FROM ${quoteIdent(rel.table)} WHERE id = ANY($1)`,
          [fkValues],
          this.client
        );
        const byId = new Map(children.map((c) => [c.__child_id, c]));
        for (const row of rows) {
          const child = byId.get(row[rel.localKey]);
          if (child) {
            delete child.__child_id;
            row[embed.name] = child;
          }
        }
      }
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
        let sql = `SELECT ${columns === '*' ? '*' : columns} FROM ${quoteIdent(this.table)} ${clause}`;
        if (this.orders.length) {
          sql += ` ORDER BY ${this.orders.map((o) => `${quoteIdent(o.column)} ${o.ascending ? 'ASC' : 'DESC'}`).join(', ')}`;
        }
        if (this.limitN != null) sql += ` LIMIT ${this.limitN}`;

        const { rows } = await query<Record<string, unknown>>(sql, params, this.client);
        let dataRows = await this.attachEmbeds(rows, embeds);

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
        const rows = Array.isArray(this.payload) ? this.payload : [this.payload!];
        const inserted: Record<string, unknown>[] = [];

        for (const row of rows) {
          const data = { ...row };
          if (!data.id) data.id = randomUUID();
          const cols = Object.keys(data);
          const vals = Object.values(data);
          const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');

          let sql = `INSERT INTO ${quoteIdent(this.table)} (${cols.map(quoteIdent).join(', ')})
                     VALUES (${placeholders})`;

          if (this.operation === 'upsert') {
            const updates = cols.filter((c) => c !== 'id').map((c, i) => `${quoteIdent(c)} = EXCLUDED.${quoteIdent(c)}`);
            if (updates.length) {
              sql += ` ON CONFLICT (id) DO UPDATE SET ${updates.join(', ')}`;
            } else {
              sql += ` ON CONFLICT (id) DO NOTHING`;
            }
          }

          sql += ' RETURNING *';
          const { rows: result } = await query<Record<string, unknown>>(sql, vals, this.client);
          if (result[0]) inserted.push(result[0]);
        }

        if (this.singleMode === 'single' || this.singleMode === 'maybe') {
          return { data: inserted[0] ?? null, error: null };
        }
        return { data: inserted, error: null };
      }

      if (this.operation === 'update') {
        const data = this.payload as Record<string, unknown>;
        const cols = Object.keys(data);
        const vals = Object.values(data);
        const { clause, params } = this.buildWhere(cols.length + 1);
        const setClause = cols.map((c, i) => `${quoteIdent(c)} = $${i + 1}`).join(', ');
        const sql = `UPDATE ${quoteIdent(this.table)} SET ${setClause} ${clause} RETURNING *`;
        const { rows } = await query<Record<string, unknown>>(sql, [...vals, ...params], this.client);
        if (this.singleMode === 'single') return { data: rows[0] ?? null, error: null };
        return { data: rows, error: null };
      }

      if (this.operation === 'delete') {
        const { clause, params } = this.buildWhere();
        await query(`DELETE FROM ${quoteIdent(this.table)} ${clause}`, params, this.client);
        return { data: null, error: null };
      }

      return { data: null, error: { message: 'Operação não suportada' } };
    } catch (error) {
      return { data: null, error: toDbError(error) };
    }
  }
}
