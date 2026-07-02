import { NextRequest, NextResponse } from 'next/server';
import { requireMasterUser } from '@/lib/admin-auth-server';
import { getStockOne } from '@/lib/neumaticos-andres/client';
import { getNeumaticosAndresConfig } from '@/lib/neumaticos-andres/config';

export async function POST(request: NextRequest) {
  const auth = await requireMasterUser();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const config = getNeumaticosAndresConfig();
  if (!config.isConfigured) {
    return NextResponse.json(
      { ok: false, error: 'Credenciais não configuradas no .env (NEUMATICOS_ANDRES_LOGIN / PASSWORD).' },
      { status: 503 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const article =
    (typeof body.article === 'string' && body.article.trim()) ||
    '3286341675412';

  try {
    const data = await getStockOne(article);
    const articleData = data.articles?.[0];
    const connected = data.success === 1 && articleData?.success === 1;

    return NextResponse.json({
      ok: connected,
      baseUrl: config.baseUrl,
      testMode: config.testMode,
      article,
      sample: articleData
        ? {
            productId: articleData['product-id'],
            ean: articleData.ean,
            amount: articleData.amount,
            price: articleData.price,
          }
        : null,
      errors: data.errors?.length ? data.errors : articleData?.errors,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Falha na conexão';
    return NextResponse.json({ ok: false, error: msg, baseUrl: config.baseUrl }, { status: 500 });
  }
}
