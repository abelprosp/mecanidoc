import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserFromCookies } from '@/lib/auth/session';
import { withAdminContext } from '@/lib/db/pool';
import { buildQuote, normalizeDeliveryType, normalizeQuoteItems, QuoteError } from '@/lib/checkout/quote';

/**
 * Orçamento não vinculativo para exibir no checkout. Mesmo cálculo do servidor que
 * será usado na criação da encomenda — o browser nunca envia preços.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const session = await getSessionUserFromCookies();

    const items = normalizeQuoteItems(body?.items);
    const deliveryType = normalizeDeliveryType(body?.deliveryType);
    const warranty = body?.warranty !== false;

    const quote = await withAdminContext((client) =>
      buildQuote(client, { items, deliveryType, warranty, userId: session?.id ?? '' })
    );

    return NextResponse.json({ ok: true, quote });
  } catch (error) {
    if (error instanceof QuoteError) {
      return NextResponse.json({ ok: false, error: error.message, code: error.code, details: error.details }, { status: error.status });
    }
    console.error('[checkout/quote]', error);
    return NextResponse.json({ ok: false, error: 'Impossible de calculer le montant.' }, { status: 500 });
  }
}
