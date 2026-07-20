import 'server-only';

import { NextRequest } from 'next/server';
import { createAdminDbClient } from '@/lib/db/client';
import { hashApiKey } from './crypto';

export type SupplierApiAuth = {
  supplierId: string;
  profileId: string;
  companyName: string;
  apiKeyId: string;
};

function extractBearerOrKey(request: NextRequest): string | null {
  const auth = request.headers.get('authorization') || '';
  if (auth.toLowerCase().startsWith('bearer ')) {
    const token = auth.slice(7).trim();
    return token || null;
  }
  const headerKey = request.headers.get('x-api-key')?.trim();
  return headerKey || null;
}

export async function authenticateSupplierApi(
  request: NextRequest
): Promise<{ ok: true; auth: SupplierApiAuth } | { ok: false; status: number; error: string }> {
  const rawKey = extractBearerOrKey(request);
  if (!rawKey) {
    return { ok: false, status: 401, error: 'API key em falta. Use Authorization: Bearer <key> ou X-API-Key.' };
  }

  const keyHash = hashApiKey(rawKey);
  const admin = createAdminDbClient();

  const { data: keyRow, error } = await admin
    .from('supplier_api_keys')
    .select('id, supplier_id, is_active, revoked_at')
    .eq('key_hash', keyHash)
    .maybeSingle();

  if (error) {
    return { ok: false, status: 500, error: 'Erro ao validar API key' };
  }

  if (!keyRow || keyRow.is_active === false || keyRow.revoked_at) {
    return { ok: false, status: 401, error: 'API key inválida ou revogada' };
  }

  const { data: supplier } = await admin
    .from('suppliers')
    .select('id, profile_id, company_name, is_approved')
    .eq('id', keyRow.supplier_id)
    .maybeSingle();

  if (!supplier) {
    return { ok: false, status: 401, error: 'Fornecedor associado à key não encontrado' };
  }

  if (!supplier.is_approved) {
    return { ok: false, status: 403, error: 'Fornecedor ainda não aprovado' };
  }

  await admin
    .from('supplier_api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', keyRow.id);

  return {
    ok: true,
    auth: {
      supplierId: supplier.id,
      profileId: supplier.profile_id,
      companyName: supplier.company_name,
      apiKeyId: keyRow.id,
    },
  };
}
