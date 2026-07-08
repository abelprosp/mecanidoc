import 'server-only';

import { getStockOne } from '@/lib/neumaticos-andres/client';
import { fetchProductByGtin, normalizeGtin } from '@/lib/gtin-enrich/client';
import type { GtinProductDetail } from '@/lib/gtin-enrich/types';

export type ResolveProductNameResult = {
  naRef: string | null;
  ean: string | null;
  eanSource: 'argument' | 'na' | 'na_override' | null;
  detail: GtinProductDetail | null;
  naPrice: number | null;
  naStock: number | null;
  error?: string;
};

export async function resolveProductNameByNaRef(input: {
  naRef?: string | null;
  ean?: string | null;
}): Promise<ResolveProductNameResult> {
  const naRef = input.naRef?.trim() || null;
  let ean = normalizeGtin(input.ean || '');
  let eanSource: ResolveProductNameResult['eanSource'] = ean ? 'argument' : null;
  let naPrice: number | null = null;
  let naStock: number | null = null;

  if (naRef) {
    try {
      const stock = await getStockOne(naRef);
      const article = stock.articles?.[0];
      if (article?.success === 1) {
        const naEan = normalizeGtin(article.ean || '');
        naPrice = article.price != null ? Number(article.price) : null;
        naStock = article.amount != null ? Number(article.amount) : null;
        if (naEan) {
          eanSource = ean && ean !== naEan ? 'na_override' : 'na';
          ean = naEan;
        }
      } else if (!ean) {
        return { naRef, ean: null, eanSource, detail: null, naPrice, naStock, error: 'na_article_not_found' };
      }
    } catch {
      if (!ean) {
        return { naRef, ean: null, eanSource, detail: null, naPrice, naStock, error: 'na_request_failed' };
      }
    }
  }

  if (!ean || ean.length < 8) {
    return { naRef, ean, eanSource, detail: null, naPrice, naStock, error: 'invalid_ean' };
  }

  const detail = await fetchProductByGtin(ean, { naRef });
  return { naRef, ean, eanSource, detail, naPrice, naStock, error: detail ? undefined : 'not_found' };
}
