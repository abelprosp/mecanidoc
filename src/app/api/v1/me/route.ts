import { NextRequest, NextResponse } from 'next/server';
import { createAdminDbClient } from '@/lib/db/client';
import { authenticateSupplierApi } from '@/lib/supplier-api/auth';

/** Informações do fornecedor autenticado + resumo dos produtos. */
export async function GET(request: NextRequest) {
  const authResult = await authenticateSupplierApi(request);
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const admin = createAdminDbClient();
  const { count: total } = await admin
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('supplier_id', authResult.auth.supplierId);

  const { count: active } = await admin
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('supplier_id', authResult.auth.supplierId)
    .eq('is_active', true);

  return NextResponse.json({
    supplier: {
      id: authResult.auth.supplierId,
      company_name: authResult.auth.companyName,
    },
    products: {
      total: total || 0,
      active: active || 0,
    },
    endpoints: {
      products: '/api/v1/products',
      product: '/api/v1/products/{id}',
      me: '/api/v1/me',
    },
  });
}
