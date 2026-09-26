import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserFromCookies } from '@/lib/auth/session';
import { createServerDbClient } from '@/lib/db/client';
import {
  TABLE_POLICIES,
  isAllowed,
  restrictSelect,
  stripProtectedColumns,
  type Actor,
} from '@/lib/db/api-policy';
import { DbValidationError, MAX_QUERY_LIMIT, type DbOperation, type QueryBuilder } from '@/lib/db/query-builder';

type DbRequestBody = {
  table: string;
  operation: DbOperation;
  select?: string;
  returning?: string;
  countOnly?: boolean;
  payload?: Record<string, unknown> | Record<string, unknown>[];
  filters?: Array<{ type: string; column: string; value: unknown; op?: string }>;
  orders?: Array<{ column: string; ascending: boolean }>;
  limit?: number;
  singleMode?: 'none' | 'single' | 'maybe';
};

const OPERATIONS: ReadonlySet<string> = new Set(['select', 'insert', 'update', 'delete', 'upsert']);
const MAX_FILTERS = 40;
const MAX_ORDERS = 5;
const MAX_PAYLOAD_ROWS = 200;

function applyBodyToBuilder(builder: QueryBuilder, body: DbRequestBody, select: string) {
  if (body.operation === 'select') {
    builder.select(select, body.countOnly ? { count: 'exact', head: true } : undefined);
  }
  if (body.operation === 'insert' && body.payload) builder.insert(body.payload);
  if (body.operation === 'update' && body.payload) builder.update(body.payload as Record<string, unknown>);
  if (body.operation === 'upsert' && body.payload) builder.upsert(body.payload);
  if (body.operation === 'delete') builder.delete();
  if (body.operation !== 'select' && body.returning) builder.returning(body.returning);

  for (const f of body.filters || []) {
    if (typeof f.column !== 'string' && f.type !== 'or') continue;
    if (f.op === 'contains') builder.contains(f.column, f.value as Record<string, unknown>);
    else if (f.type === 'eq') builder.eq(f.column, f.value);
    else if (f.type === 'in') builder.in(f.column, Array.isArray(f.value) ? (f.value as unknown[]) : []);
    else if (f.type === 'not') builder.not(f.column, f.op || 'is', f.value);
    else if (f.type === 'gte') builder.gte(f.column, f.value);
    else if (f.type === 'lte') builder.lte(f.column, f.value);
    else if (f.type === 'ilike') builder.ilike(f.column, String(f.value));
    else if (f.type === 'neq') builder.neq(f.column, f.value);
    else if (f.type === 'or') builder.or(String(f.value));
  }

  for (const o of body.orders || []) builder.order(o.column, { ascending: o.ascending !== false });
  if (body.limit != null) builder.limit(Math.min(Number(body.limit), MAX_QUERY_LIMIT));
  if (body.singleMode === 'single') builder.single();
  if (body.singleMode === 'maybe') builder.maybeSingle();
}

function validateShape(body: DbRequestBody): string | null {
  if (!body || typeof body !== 'object') return 'Pedido inválido';
  if (typeof body.table !== 'string' || !OPERATIONS.has(body.operation)) return 'Pedido inválido';
  if (body.filters && (!Array.isArray(body.filters) || body.filters.length > MAX_FILTERS)) return 'Demasiados filtros';
  if (body.orders && (!Array.isArray(body.orders) || body.orders.length > MAX_ORDERS)) return 'Demasiadas ordenações';
  if (body.payload) {
    const rows = Array.isArray(body.payload) ? body.payload : [body.payload];
    if (rows.length > MAX_PAYLOAD_ROWS) return 'Payload demasiado grande';
    for (const row of rows) {
      if (!row || typeof row !== 'object' || Array.isArray(row)) return 'Payload inválido';
    }
  }
  if ((body.operation === 'update' || body.operation === 'delete') && !(body.filters && body.filters.length)) {
    return 'Operação sem filtro não é permitida';
  }
  return null;
}

export async function POST(request: NextRequest) {
  let body: DbRequestBody;
  try {
    body = (await request.json()) as DbRequestBody;
  } catch {
    return NextResponse.json({ data: null, error: { message: 'JSON inválido' } }, { status: 400 });
  }

  const shapeError = validateShape(body);
  if (shapeError) {
    return NextResponse.json({ data: null, error: { message: shapeError } }, { status: 400 });
  }

  const policy = TABLE_POLICIES[body.table];
  if (!policy) {
    return NextResponse.json({ data: null, error: { message: 'Tabela não disponível' } }, { status: 403 });
  }

  const session = await getSessionUserFromCookies();
  const userId = session?.id ?? null;

  try {
    const server = await createServerDbClient(userId);

    let isMaster = false;
    if (userId) {
      const { data: profile } = await server.from('profiles').select('role').eq('id', userId).maybeSingle();
      isMaster = (profile as { role?: string } | null)?.role === 'master';
    }
    const actor: Actor = { userId, isMaster };

    if (!isAllowed(policy, body.operation, actor)) {
      const status = userId ? 403 : 401;
      return NextResponse.json(
        { data: null, error: { message: userId ? 'Accès refusé' : 'Non autorisé' } },
        { status }
      );
    }

    let select = body.select || '*';
    if (body.operation === 'select') {
      select = restrictSelect(policy, select, actor);
    } else if (body.returning) {
      body.returning = restrictSelect(policy, body.returning, actor);
    }

    if (body.payload) {
      stripProtectedColumns(policy, body.payload, actor);
      const rows = Array.isArray(body.payload) ? body.payload : [body.payload];
      if (body.operation === 'update' && Object.keys(rows[0] || {}).length === 0) {
        return NextResponse.json({ data: null, error: { message: 'Nenhuma coluna alterável' } }, { status: 400 });
      }
    }

    const builder = server.from(body.table);
    applyBodyToBuilder(builder, body, select);
    const result = await builder.execute();
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof DbValidationError || /Coluna não permitida/.test((error as Error)?.message || '')) {
      return NextResponse.json({ data: null, error: { message: (error as Error).message } }, { status: 400 });
    }
    const msg = error instanceof Error ? error.message : 'Erro DB';
    // Não expor detalhes internos ao browser; ficam no log do servidor.
    console.error('[api/db]', body.table, body.operation, msg);
    const pgCode = (error as { code?: string })?.code;
    const status = pgCode === '42501' ? 403 : 500;
    return NextResponse.json(
      { data: null, error: { message: status === 403 ? 'Accès refusé' : 'Erreur base de données', code: pgCode } },
      { status }
    );
  }
}
