import { NextRequest, NextResponse } from 'next/server';
import { getStockOne } from '@/lib/neumaticos-andres/client';
import { getNeumaticosAndresConfig } from '@/lib/neumaticos-andres/config';

export async function GET(request: NextRequest) {
  const config = getNeumaticosAndresConfig();
  if (!config.isConfigured) {
    return NextResponse.json({ error: 'Integração não configurada.' }, { status: 503 });
  }

  const article = request.nextUrl.searchParams.get('article')?.trim();
  const postCode = request.nextUrl.searchParams.get('postCode')?.trim() || undefined;

  if (!article) {
    return NextResponse.json({ error: 'Parâmetro article (EAN ou product-id) é obrigatório.' }, { status: 400 });
  }

  try {
    const data = await getStockOne(article, postCode);
    return NextResponse.json({ ok: true, data });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro ao consultar stock';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
