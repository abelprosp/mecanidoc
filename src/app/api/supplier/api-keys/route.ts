import { NextRequest, NextResponse } from 'next/server';
import { createAdminDbClient } from '@/lib/db/client';
import { requireSupplierOrMasterUser } from '@/lib/admin-auth-server';
import { generateApiKey } from '@/lib/supplier-api/crypto';

async function resolveSupplierId(userId: string, bodySupplierId?: string) {
  const admin = createAdminDbClient();
  const { data: profile } = await admin.from('profiles').select('role').eq('id', userId).single();

  if (profile?.role === 'master' && bodySupplierId) {
    return bodySupplierId;
  }

  const { data: supplier } = await admin
    .from('suppliers')
    .select('id, is_approved')
    .eq('profile_id', userId)
    .maybeSingle();

  if (!supplier) return null;
  if (!supplier.is_approved && profile?.role !== 'master') return null;
  return supplier.id as string;
}

export async function GET() {
  const auth = await requireSupplierOrMasterUser();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const supplierId = await resolveSupplierId(auth.user.id);
  if (!supplierId) {
    return NextResponse.json({ error: 'Fornecedor não encontrado ou não aprovado' }, { status: 403 });
  }

  const admin = createAdminDbClient();
  const { data, error } = await admin
    .from('supplier_api_keys')
    .select('id, name, key_prefix, is_active, last_used_at, created_at, revoked_at')
    .eq('supplier_id', supplierId)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    keys: (data || []).map((k: any) => ({
      id: k.id,
      name: k.name,
      prefix: k.key_prefix,
      is_active: Boolean(k.is_active) && !k.revoked_at,
      last_used_at: k.last_used_at,
      created_at: k.created_at,
      revoked_at: k.revoked_at,
    })),
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireSupplierOrMasterUser();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json().catch(() => ({}));
  const name =
    typeof body.name === 'string' && body.name.trim() ? body.name.trim() : 'Chave API';
  const supplierId = await resolveSupplierId(
    auth.user.id,
    typeof body.supplier_id === 'string' ? body.supplier_id : undefined
  );

  if (!supplierId) {
    return NextResponse.json({ error: 'Fornecedor não encontrado ou não aprovado' }, { status: 403 });
  }

  const generated = generateApiKey();
  const admin = createAdminDbClient();
  const { data, error } = await admin
    .from('supplier_api_keys')
    .insert({
      supplier_id: supplierId,
      name,
      key_prefix: generated.keyPrefix,
      key_hash: generated.keyHash,
      is_active: true,
    })
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    key: {
      id: data.id,
      name: data.name,
      prefix: data.key_prefix,
      created_at: data.created_at,
      /** Mostrada apenas uma vez — guarde em local seguro. */
      api_key: generated.rawKey,
    },
    message: 'Guarde a API key agora — não será mostrada novamente.',
  });
}

export async function DELETE(request: NextRequest) {
  const auth = await requireSupplierOrMasterUser();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json().catch(() => ({}));
  const keyId = typeof body.id === 'string' ? body.id : null;
  if (!keyId) {
    return NextResponse.json({ error: 'Campo "id" obrigatório' }, { status: 400 });
  }

  const supplierId = await resolveSupplierId(auth.user.id);
  if (!supplierId) {
    return NextResponse.json({ error: 'Fornecedor não encontrado ou não aprovado' }, { status: 403 });
  }

  const admin = createAdminDbClient();
  const { data: existing } = await admin
    .from('supplier_api_keys')
    .select('id, supplier_id')
    .eq('id', keyId)
    .maybeSingle();

  if (!existing || existing.supplier_id !== supplierId) {
    const { data: profile } = await admin.from('profiles').select('role').eq('id', auth.user.id).single();
    if (profile?.role !== 'master' || !existing) {
      return NextResponse.json({ error: 'Chave não encontrada' }, { status: 404 });
    }
  }

  const { error } = await admin
    .from('supplier_api_keys')
    .update({
      is_active: false,
      revoked_at: new Date().toISOString(),
    })
    .eq('id', keyId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
