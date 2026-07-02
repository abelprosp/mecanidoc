import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserFromCookies } from '@/lib/auth/session';
import { createAdminDbClient, createServerDbClient } from '@/lib/db/client';
import { QueryBuilder } from '@/lib/db/query-builder';

type DbRequestBody = {
  admin?: boolean;
  table: string;
  operation: 'select' | 'insert' | 'update' | 'delete' | 'upsert';
  select?: string;
  countOnly?: boolean;
  payload?: Record<string, unknown> | Record<string, unknown>[];
  filters?: Array<{ type: string; column: string; value: unknown; op?: string }>;
  orders?: Array<{ column: string; ascending: boolean }>;
  limit?: number;
  singleMode?: 'none' | 'single' | 'maybe';
};

function rebuildBuilder(body: DbRequestBody, userId: string | null): QueryBuilder {
  const db = body.admin ? createAdminDbClient() : null;
  const builder = db ? db.from(body.table) : new QueryBuilder(body.table);

  if (body.operation === 'select') builder.select(body.select || '*', body.countOnly ? { count: 'exact', head: true } : undefined);
  if (body.operation === 'insert' && body.payload) builder.insert(body.payload);
  if (body.operation === 'update' && body.payload) builder.update(body.payload as Record<string, unknown>);
  if (body.operation === 'upsert' && body.payload) builder.upsert(body.payload);
  if (body.operation === 'delete') builder.delete();

  for (const f of body.filters || []) {
    if (f.op === 'contains') builder.contains(f.column, f.value as Record<string, unknown>);
    else if (f.type === 'eq') builder.eq(f.column, f.value);
    else if (f.type === 'in') builder.in(f.column, f.value as unknown[]);
    else if (f.type === 'not') builder.not(f.column, f.op || 'is', f.value);
    else if (f.type === 'gte') builder.gte(f.column, f.value);
    else if (f.type === 'lte') builder.lte(f.column, f.value);
    else if (f.type === 'ilike') builder.ilike(f.column, String(f.value));
    else if (f.type === 'neq') builder.neq(f.column, f.value);
    else if (f.type === 'or') builder.or(String(f.value));
  }

  for (const o of body.orders || []) builder.order(o.column, { ascending: o.ascending });
  if (body.limit != null) builder.limit(body.limit);
  if (body.singleMode === 'single') builder.single();
  if (body.singleMode === 'maybe') builder.maybeSingle();

  void userId;
  return builder;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as DbRequestBody;
    if (!body.table || !body.operation) {
      return NextResponse.json({ error: 'Pedido inválido' }, { status: 400 });
    }

    const session = await getSessionUserFromCookies();
    const userId = session?.id ?? null;

    if (body.admin) {
      if (!userId) return NextResponse.json({ error: 'Non autorise' }, { status: 401 });
      const server = await createServerDbClient(userId);
      const { data: profile } = await server.from('profiles').select('role').eq('id', userId).single();
      if ((profile as { role?: string } | null)?.role !== 'master') {
        return NextResponse.json({ error: 'Acces refuse' }, { status: 403 });
      }
      const admin = createAdminDbClient();
      const builder = admin.from(body.table);
      applyBodyToBuilder(builder, body);
      const result = await builder.execute();
      return NextResponse.json(result);
    }

    const server = await createServerDbClient(userId);
    const builder = server.from(body.table);
    applyBodyToBuilder(builder, body);
    const result = await builder.execute();
    return NextResponse.json(result);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erro DB';
    return NextResponse.json({ data: null, error: { message: msg } }, { status: 500 });
  }
}

function applyBodyToBuilder(builder: QueryBuilder, body: DbRequestBody) {
  if (body.operation === 'select') builder.select(body.select || '*', body.countOnly ? { count: 'exact', head: true } : undefined);
  if (body.operation === 'insert' && body.payload) builder.insert(body.payload);
  if (body.operation === 'update' && body.payload) builder.update(body.payload as Record<string, unknown>);
  if (body.operation === 'upsert' && body.payload) builder.upsert(body.payload);
  if (body.operation === 'delete') builder.delete();

  for (const f of body.filters || []) {
    if (f.op === 'contains') builder.contains(f.column, f.value as Record<string, unknown>);
    else if (f.type === 'eq') builder.eq(f.column, f.value);
    else if (f.type === 'in') builder.in(f.column, f.value as unknown[]);
    else if (f.type === 'not') builder.not(f.column, f.op || 'is', f.value);
    else if (f.type === 'gte') builder.gte(f.column, f.value);
    else if (f.type === 'lte') builder.lte(f.column, f.value);
    else if (f.type === 'ilike') builder.ilike(f.column, String(f.value));
    else if (f.type === 'neq') builder.neq(f.column, f.value);
    else if (f.type === 'or') builder.or(String(f.value));
  }

  for (const o of body.orders || []) builder.order(o.column, { ascending: o.ascending });
  if (body.limit != null) builder.limit(body.limit);
  if (body.singleMode === 'single') builder.single();
  if (body.singleMode === 'maybe') builder.maybeSingle();
}
