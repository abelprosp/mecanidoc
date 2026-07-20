import { NextRequest, NextResponse } from 'next/server';
import { createAdminDbClient } from '@/lib/db/client';
import { authenticateSupplierApi } from '@/lib/supplier-api/auth';
import {
  PRODUCT_PUBLIC_FIELDS,
  normalizeProductInput,
  serializeProduct,
  type SupplierProductInput,
} from '@/lib/supplier-api/products';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: Ctx) {
  const authResult = await authenticateSupplierApi(request);
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { id } = await context.params;
  const admin = createAdminDbClient();
  const { data, error } = await admin
    .from('products')
    .select(PRODUCT_PUBLIC_FIELDS)
    .eq('id', id)
    .eq('supplier_id', authResult.auth.supplierId)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });

  return NextResponse.json({ data: serializeProduct(data) });
}

export async function PATCH(request: NextRequest, context: Ctx) {
  const authResult = await authenticateSupplierApi(request);
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as SupplierProductInput | null;
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const normalized = normalizeProductInput(body, authResult.auth, true);
  if (!normalized.ok) {
    return NextResponse.json({ error: normalized.error }, { status: 400 });
  }

  const admin = createAdminDbClient();
  const { data: existing } = await admin
    .from('products')
    .select('id')
    .eq('id', id)
    .eq('supplier_id', authResult.auth.supplierId)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });
  }

  const { data, error } = await admin
    .from('products')
    .update({
      ...normalized.data,
      last_stock_sync_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('supplier_id', authResult.auth.supplierId)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: serializeProduct(data) });
}

export async function DELETE(request: NextRequest, context: Ctx) {
  const authResult = await authenticateSupplierApi(request);
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { id } = await context.params;
  const hard = new URL(request.url).searchParams.get('hard') === '1';
  const admin = createAdminDbClient();

  const { data: existing } = await admin
    .from('products')
    .select('id')
    .eq('id', id)
    .eq('supplier_id', authResult.auth.supplierId)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });
  }

  if (hard) {
    const { error } = await admin
      .from('products')
      .delete()
      .eq('id', id)
      .eq('supplier_id', authResult.auth.supplierId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, deleted: true });
  }

  const { data, error } = await admin
    .from('products')
    .update({ is_active: false })
    .eq('id', id)
    .eq('supplier_id', authResult.auth.supplierId)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, data: serializeProduct(data) });
}
