import { NextRequest, NextResponse } from 'next/server';
import { requireMasterUser } from '@/lib/admin-auth-server';
import { getStockOne, NeumaticosAndresApiError } from '@/lib/neumaticos-andres/client';
import { getNeumaticosCredentialsStatus, resolveNeumaticosAndresConfig } from '@/lib/neumaticos-andres/credentials';

export async function POST(request: NextRequest) {
  const auth = await requireMasterUser();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const config = await resolveNeumaticosAndresConfig();
  const status = await getNeumaticosCredentialsStatus().catch(() => null);
  if (!config.isConfigured) {
    return NextResponse.json(
      {
        ok: false,
        error:
          'Credenciais não configuradas. Guarde login/password no painel ou defina NEUMATICOS_ANDRES_LOGIN / PASSWORD no .env.',
      },
      { status: 503 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const article =
    (typeof body.article === 'string' && body.article.trim()) ||
    '3286341675412';

  try {
    const data = await getStockOne(article, '75001', config);
    const articleData = data.articles?.[0];
    const articleOk = articleData?.success === 1;
    const authError = (data.errors || []).some((e) =>
      /auth|login|password|credential|unauthor/i.test(e['error-message'] || '')
    );
    const connected = data.success === 1 || Boolean(articleData) || !authError;

    return NextResponse.json({
      ok: connected,
      articleFound: articleOk,
      baseUrl: config.baseUrl,
      testMode: config.testMode,
      source: status?.source || null,
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
      error: connected
        ? undefined
        : articleData?.errors?.[0]?.['error-message'] ||
          data.errors?.[0]?.['error-message'] ||
          'A API recusou a ligação.',
      warning:
        connected && !articleOk
          ? 'API autenticada. O EAN de teste não existe no catálogo (normal) — a ligação está ok.'
          : undefined,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Falha na conexão';
    const envHint =
      status?.source === 'env' && !config.baseUrl.includes('backend.genasa.es')
        ? ' (o .env ainda aponta para teste; mude NEUMATICOS_ANDRES_BASE_URL para https://backend.genasa.es)'
        : '';
    const isUpstream = error instanceof NeumaticosAndresApiError;
    return NextResponse.json(
      {
        ok: false,
        error: `${msg}${envHint}`,
        baseUrl: config.baseUrl,
        testMode: config.testMode,
        source: status?.source || null,
      },
      { status: isUpstream ? 200 : 500 }
    );
  }
}
