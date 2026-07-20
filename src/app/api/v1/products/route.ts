import { NextRequest, NextResponse } from 'next/server';
import { createAdminDbClient } from '@/lib/db/client';
import { authenticateSupplierApi } from '@/lib/supplier-api/auth';
import {
  PRODUCT_PUBLIC_FIELDS,
  findSupplierProduct,
  normalizeProductInput,
  serializeProduct,
  type SupplierProductInput,
} from '@/lib/supplier-api/products';

export async function GET(request: NextRequest) {
  const authResult = await authenticateSupplierApi(request);
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get('page') || 1));
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') || 50)));
  const ean = searchParams.get('ean')?.trim() || null;
  const sku = searchParams.get('sku')?.trim() || null;
  const q = searchParams.get('q')?.trim() || null;
  const activeOnly = searchParams.get('active') === '1' || searchParams.get('active') === 'true';

  const admin = createAdminDbClient();

  if (ean || sku) {
    const row = await findSupplierProduct(admin, authResult.auth.supplierId, { ean, sku });
    return NextResponse.json({
      data: row ? [serializeProduct(row)] : [],
      meta: { page: 1, limit: 1, total: row ? 1 : 0 },
    });
  }

  let query = admin
    .from('products')
    .select(PRODUCT_PUBLIC_FIELDS)
    .eq('supplier_id', authResult.auth.supplierId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (activeOnly) query = query.eq('is_active', true);
  if (q) query = query.ilike('name', `%${q}%`);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = data || [];
  // offset simples via page (o query builder não tem range; fazemos slice)
  const offset = (page - 1) * limit;
  const sliced = page > 1 ? rows.slice(0, limit) : rows;

  return NextResponse.json({
    data: sliced.map((row: Record<string, unknown>) => serializeProduct(row)),
    meta: {
      page,
      limit,
      count: sliced.length,
      offset,
      supplier: authResult.auth.companyName,
    },
  });
}

export async function POST(request: NextRequest) {
  const authResult = await authenticateSupplierApi(request);
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const items: SupplierProductInput[] = Array.isArray((body as any).products)
    ? (body as any).products
    : Array.isArray(body)
      ? body
      : [body as SupplierProductInput];

  if (!items.length) {
    return NextResponse.json({ error: 'Envie um produto ou products[]' }, { status: 400 });
  }
  if (items.length > 100) {
    return NextResponse.json({ error: 'Máximo 100 produtos por pedido' }, { status: 400 });
  }

  const admin = createAdminDbClient();
  const results: Array<{ action: string; product?: unknown; error?: string }> = [];

  for (const item of items) {
    const normalized = normalizeProductInput(item, authResult.auth, false);
    if (!normalized.ok) {
      results.push({ action: 'error', error: normalized.error });
      continue;
    }

    const ean = typeof normalized.data.ean === 'string' ? normalized.data.ean : null;
    const sku =
      typeof normalized.data.external_product_id === 'string'
        ? normalized.data.external_product_id
        : null;

    try {
      const existing = await findSupplierProduct(admin, authResult.auth.supplierId, { ean, sku });
      if (existing) {
        const { data, error } = await admin
          .from('products')
          .update({
            ...normalized.data,
            last_stock_sync_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .eq('supplier_id', authResult.auth.supplierId)
          .single();

        if (error) {
          results.push({ action: 'error', error: error.message });
        } else {
          results.push({ action: 'updated', product: serializeProduct(data) });
        }
      } else {
        const { data, error } = await admin
          .from('products')
          .insert({
            ...normalized.data,
            last_stock_sync_at: new Date().toISOString(),
          })
          .single();

        if (error) {
          results.push({ action: 'error', error: error.message });
        } else {
          results.push({ action: 'created', product: serializeProduct(data) });
        }
      }
    } catch (err: unknown) {
      results.push({
        action: 'error',
        error: err instanceof Error ? err.message : 'Erro ao gravar produto',
      });
    }
  }

  const created = results.filter((r) => r.action === 'created').length;
  const updated = results.filter((r) => r.action === 'updated').length;
  const errors = results.filter((r) => r.action === 'error').length;

  return NextResponse.json(
    {
      ok: errors === 0,
      summary: { created, updated, errors, total: results.length },
      results,
    },
    { status: errors && !created && !updated ? 400 : 200 }
  );
}
