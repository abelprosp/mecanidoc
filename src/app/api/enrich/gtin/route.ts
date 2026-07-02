import { NextRequest, NextResponse } from 'next/server';
import { requireMasterUser } from '@/lib/admin-auth-server';
import { createAdminDbClient } from '@/lib/db/client';
import { fetchProductByGtin, getGtinEnrichConfig, normalizeGtin } from '@/lib/gtin-enrich/client';
import { enrichProductById, enrichProductsBatch } from '@/lib/gtin-enrich/enrich';
import { mapGtinToProductPatch } from '@/lib/gtin-enrich/map-to-product';

export async function GET() {
  const auth = await requireMasterUser();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const config = getGtinEnrichConfig();
  return NextResponse.json({
    configured: config.isConfigured,
    providers: config.providers,
    optionalEnv: ['GTINHUB_API_KEY', 'UPCITEMDB_USER_KEY'],
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireMasterUser();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json().catch(() => ({}));
  const admin = createAdminDbClient();

  try {
    if (typeof body.ean === 'string' && body.ean.trim() && body.preview) {
      const detail = await fetchProductByGtin(body.ean.trim());
      if (!detail) {
        return NextResponse.json({ ok: false, error: 'Não encontrado nas bases GTIN.' }, { status: 404 });
      }
      return NextResponse.json({
        ok: true,
        ean: normalizeGtin(body.ean),
        source: detail.source,
        patch: mapGtinToProductPatch(detail),
        raw: detail.raw,
      });
    }

    if (typeof body.productId === 'string' && body.productId.trim()) {
      const result = await enrichProductById(admin, body.productId.trim(), {
        overwriteName: Boolean(body.overwriteName),
      });
      return NextResponse.json(result, { status: result.ok ? 200 : 400 });
    }

    if (typeof body.ean === 'string' && body.ean.trim()) {
      const { data } = await admin
        .from('products')
        .select('id')
        .eq('ean', normalizeGtin(body.ean))
        .maybeSingle();

      if (!data?.id) {
        const detail = await fetchProductByGtin(body.ean.trim());
        if (!detail) {
          return NextResponse.json({ ok: false, error: 'Não encontrado nas bases GTIN.' }, { status: 404 });
        }
        return NextResponse.json({
          ok: true,
          preview: true,
          source: detail.source,
          patch: mapGtinToProductPatch(detail),
          message: 'Encontrado na base GTIN, mas não existe produto local com este EAN.',
        });
      }

      const result = await enrichProductById(admin, data.id, {
        overwriteName: Boolean(body.overwriteName),
      });
      return NextResponse.json(result, { status: result.ok ? 200 : 400 });
    }

    if (body.all === true) {
      const batch = await enrichProductsBatch(admin, {
        limit: typeof body.limit === 'number' ? body.limit : 25,
        externalSupplier:
          typeof body.externalSupplier === 'string' ? body.externalSupplier : 'neumaticos_andres',
        onlyMissingName: body.onlyMissingName !== false,
        overwriteName: Boolean(body.overwriteName),
      });
      return NextResponse.json({ ok: true, ...batch });
    }

    return NextResponse.json(
      { error: 'Envie productId, ean, preview+ean ou all:true.' },
      { status: 400 }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro GTIN';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
